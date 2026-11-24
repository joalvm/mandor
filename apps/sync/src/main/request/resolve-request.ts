import {
    environmentScope,
    globalValuesOf,
    type EnvironmentPlace,
    type EnvironmentScope,
    type NetworkFor,
    resolveAuth,
    type TokenSource,
    variableScopeOf,
} from '@mandor/host';
import { failure, type RequestSendRequest, type Result } from '@mandor/ipc';
import { itemParentOf, type RequestItem, type RequestLine } from '@mandor/schema';
import {
    assertSafeAuthority,
    resolveTemplates,
    trimHeaderValue,
    withDefaultScheme,
    type AuthParts,
    type AuthSigning,
    type VariableScope,
} from '@mandor/vars';

import { noEffects } from './apply-script-effects.js';
import {
    guardedRequest,
    guardedResolution,
    type GuardedRequest,
    type GuardedTemplates,
    type SendGuard,
} from './guarded-resolution.js';

import { fillPathParams } from './path-params.js';
import {
    requestTemplates,
    resolvedBody,
    resolvedPairs,
    type ResolvedBody,
} from './request-templates.js';
import { sentHeaders } from './request-photo.js';
import type { ResolvedRequest } from './resolved-request.js';
import { wireSettingsOf, type WireSettings } from './wire-settings.js';

/** A request with nothing left to resolve but the files its body names, and how to send it. */
export type WireRequest = WireSettings & {
    method: string;
    url: string;
    headers: [string, string][];
    body: ResolvedBody;
    signing?: AuthSigning | undefined;
    guarded?: GuardedRequest | undefined;
};

/** The url with the query rows appended after whatever query the user wrote in it. */
function urlWithQuery(url: string, query: [string, string][]): string | null {
    try {
        const parsed = new URL(url);

        for (const [key, value] of query) {
            parsed.searchParams.append(key, value);
        }

        return parsed.toString();
    } catch {
        return null;
    }
}

/**
 * The headers of the request with the ones the auth produces beside them. The header written
 * by hand wins over the one the auth would add, whatever the case; the cookies of an API key
 * ride one `Cookie` header, added to the one the user wrote if there is one.
 */
function headersWithAuth(written: [string, string][], parts: AuthParts): [string, string][] {
    const writtenNames = new Set(written.map(([name]) => name.toLowerCase()));
    const authHeaders = parts.headers.filter(([name]) => !writtenNames.has(name.toLowerCase()));
    const authCookie = parts.cookies.map(([name, value]) => `${name}=${value}`).join('; ');
    const writtenCookie = written.find(([name]) => name.toLowerCase() === 'cookie');

    if (authCookie === '') {
        return [...written, ...authHeaders];
    }

    const cookie: [string, string] =
        writtenCookie === undefined
            ? ['Cookie', authCookie]
            : ['Cookie', `${writtenCookie[1]}; ${authCookie}`];

    return [...written.filter(([name]) => name.toLowerCase() !== 'cookie'), cookie, ...authHeaders];
}

export type ResolveOptions = {
    /** Stops the wait for an OAuth2 token, which may be a person at a browser. */
    signal?: AbortSignal | undefined;
    /** `skip` leaves the auth out: a question about the url alone must not ask for a token. */
    auth?: 'apply' | 'skip';
    /** A send of the person: the scripts it ran and the values they set. Absent: no level `script`. */
    guard?: SendGuard | undefined;
};

const NO_AUTH_PARTS: AuthParts = { headers: [], query: [], cookies: [], subprotocols: [] };

/** What `resolvedRequestOf` adds to the options of a send: whether a token is asked for, and how. */
export type ResolvedOptions = ResolveOptions & TokenSource;

type Resolution = {
    scope: EnvironmentScope;
    composed: VariableScope;
    /** The headers that leave, the inherited ones merged and the deleted ones out. */
    headers: RequestLine[];
    values: Record<string, string>;
    guarded?: GuardedTemplates | undefined;
};

/**
 * Every template of the request resolved. The headers of the folders come from the chain the
 * scope already read: one version of disk for auth, variables and headers. Merged, they count as
 * written, so they win over the auth's and the body's own, and their `{{var}}` resolve with the
 * scope of the request.
 */
function resolutionOf(
    scope: EnvironmentScope,
    request: RequestItem,
    guard: SendGuard | undefined,
): Resolution {
    assertSafeAuthority(request.url, scope.environment, scope.secrets, {
        below: globalValuesOf(scope),
        ...(guard === undefined ? {} : { script: guard.script }),
    });

    const composed = variableScopeOf(scope, guard?.script);
    const headers = sentHeaders(scope.chain, guard?.applied ?? noEffects(request));
    const templates = requestTemplates({ ...request, headers });

    if (guard === undefined) {
        return { scope, composed, headers, values: resolveTemplates(templates, composed).values };
    }

    const guarded = guardedResolution(guard, templates, headers);

    return { scope, composed, headers, values: guarded.resolved.values, guarded };
}

type AuthOf = Pick<Awaited<ReturnType<typeof resolveAuth>>, 'parts' | 'carriesSecret'>;

/**
 * The auth of the request. A send whose destination a script moved resolves it with secrets off
 * and asks no token; an OAuth2 level never sees what scripts set.
 */
async function authOf(
    place: EnvironmentPlace,
    input: Omit<RequestSendRequest, 'sendId'>,
    resolution: Resolution,
    options: ResolvedOptions,
): Promise<AuthOf> {
    const { auth, signal, ...fetching } = options;

    if (auth === 'skip') {
        return { parts: NO_AUTH_PARTS, carriesSecret: false };
    }

    const { scope, composed, guarded } = resolution;
    const sendOff = guarded?.verdict.sendOff === true;

    return resolveAuth({
        root: place.root,
        workspaceId: input.workspaceId,
        own: input.request.auth,
        chain: scope.chain,
        scope: composed,
        environmentId: input.environmentId,
        signal,
        ...(guarded === undefined
            ? {}
            : { oauthScope: variableScopeOf(scope), secretsOff: sendOff }),
        ...(sendOff ? { tokens: 'none' } : fetching),
    });
}

/**
 * Resolves the request as written on screen against the environment: every template is final
 * and the auth is applied, ready to become bytes or code. The variable in the authority of the
 * url is refused by throwing, as the sockets of Async do. A name nobody defined is not a refusal:
 * it stays in the text as it was written, and what the server makes of it is the person's to
 * read in the answer. Only a url that is not absolute, or a path parameter with no value, cannot
 * go out at all, and the refusal names what is wrong.
 */
export async function resolvedRequestOf(
    place: EnvironmentPlace,
    input: Omit<RequestSendRequest, 'sendId'>,
    options: ResolvedOptions,
): Promise<Result<ResolvedRequest>> {
    const { request } = input;
    const scope =
        options.guard?.scope ??
        (await environmentScope(
            place,
            input.workspaceId,
            input.environmentId,
            itemParentOf(input.itemPath),
        ));
    const resolution = resolutionOf(scope, request, options.guard);
    const { parts, carriesSecret } = await authOf(place, input, resolution, options);

    if (parts.subprotocols.length > 0) {
        return failure('bad-request', 'a subprotocol does not apply to an http request');
    }

    const { values, headers, guarded } = resolution;
    const filled = fillPathParams(
        values['url'] ?? '',
        resolvedPairs('path', request.pathParams, values),
    );

    if (!filled.ok) {
        return failure('bad-request', `the path parameter "${filled.name}" has no value`);
    }

    // A url typed without its scheme goes over http, as a browser bar takes it.
    const url = urlWithQuery(withDefaultScheme(filled.url, 'http'), [
        ...resolvedPairs('query', request.query, values),
        ...parts.query,
    ]);

    if (url === null) {
        return failure('bad-request', 'the url is not an absolute url');
    }

    const authHeaders = carriesSecret ? parts.headers.map(([name]) => name) : [];

    return {
        ok: true,
        value: {
            method: request.method.toUpperCase(),
            url,
            headers: headersWithAuth(
                resolvedPairs('header', headers, values).map(([name, value]) => [
                    name,
                    trimHeaderValue(value),
                ]),
                parts,
            ),
            body: resolvedBody(request.body, values),
            settings: request.settings,
            signing: parts.signing,
            ...(guarded === undefined ? {} : { guarded: guardedRequest(guarded, authHeaders) }),
        },
    };
}

/** The request of a send: resolved, with the token fetched and the settings as transport. */
export async function resolveRequest(
    place: EnvironmentPlace,
    input: Omit<RequestSendRequest, 'sendId'>,
    options: ResolveOptions & { networkFor: NetworkFor },
): Promise<Result<WireRequest>> {
    const resolved = await resolvedRequestOf(place, input, { ...options, tokens: 'fetch' });

    if (!resolved.ok) {
        return resolved;
    }

    const { settings, ...rest } = resolved.value;

    return { ok: true, value: { ...rest, ...wireSettingsOf(settings) } };
}
