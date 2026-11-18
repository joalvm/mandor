import {
    type AuthConfig,
    authChainOf,
    type ConcreteAuth,
    type FolderChainLevel,
} from '@mandor/schema';
import {
    authParts,
    authTemplates,
    effectiveAuth,
    REDACTED,
    resolveTemplates,
    type AuthParts,
    type AuthSigning,
    type VariableScope,
} from '@mandor/vars';

import { fetchThrough } from '../network/fetch-through.js';
import type { NetworkFor } from '../network/network-for.js';
import { rememberSessionSecrets } from '../secret/session-secrets.js';
import { openInSystemBrowser } from './oauth/open-in-system-browser.js';
import { resolvedOAuth } from './oauth/resolved-oauth.js';
import { tokenFor } from './oauth/token-for.js';

/** The parts one item or connection sends, and which level of its chain decided. */
export type ResolvedAuth = {
    parts: AuthParts;
    /**
     * Where the decision came from: 0 is the auth of the item or connection itself, 1 its
     * closest folder and so on; null says every level inherited, so none was applied.
     */
    from: number | null;
    /** A marked variable went into the parts, or an OAuth2 flow gave them a real token. */
    carriesSecret: boolean;
};

export type ResolveAuthInput = {
    root: string;
    workspaceId: string;
    /** The auth of the item or connection, read from its own file by the caller. */
    own: AuthConfig | undefined;
    /**
     * The chain the caller read for this send, closest folder first and the workspace last: a
     * connection is not in the collection, so its chain is the workspace alone.
     */
    chain: readonly FolderChainLevel[];
    /** The scope the caller already armed for the rest of the templates of the request. */
    scope: VariableScope;
    /**
     * The scope an OAuth2 level resolves with instead: the token endpoint is the one place a
     * secret travels to another URL, so a send that ran scripts hands the scope without them.
     */
    oauthScope?: VariableScope | undefined;
    /** Resolves every template with secrets off: each marked name stays as `{{name}}`. */
    secretsOff?: boolean | undefined;
    /** The environment the caller resolved against: an OAuth2 token never crosses to another. */
    environmentId: string | null;
    /** Stops the wait for a token, which may be a person at a browser. */
    signal?: AbortSignal | undefined;
} & TokenSource;

/**
 * Where an OAuth2 token comes from. `fetch`, the default, asks for it through the network the
 * send itself goes out by. `placeholder` puts the redaction marker in its place: a snippet does
 * not ask for a token, and PKCE opens a browser. `none` sends no token and asks for none: a send
 * whose destination a script moved carries no credential.
 */
export type TokenSource =
    { tokens?: 'fetch'; networkFor: NetworkFor } | { tokens: 'placeholder' } | { tokens: 'none' };

/** The token of a source that asks no endpoint. */
const UNFETCHED_TOKEN: Record<'placeholder' | 'none', string | undefined> = {
    placeholder: REDACTED,
    none: undefined,
};

type UnfetchedSource = Extract<TokenSource, { tokens: 'placeholder' | 'none' }>;

function isUnfetched(source: TokenSource): source is UnfetchedSource {
    return source.tokens === 'placeholder' || source.tokens === 'none';
}

const OAUTH_TYPES: ReadonlySet<ConcreteAuth['type']> = new Set([
    'oauth2-client-credentials',
    'oauth2-code-pkce',
]);

/**
 * Resolves the chain — own first — into the parts ready to apply. What a marked variable helped
 * build is remembered as a session secret, because a header encoded from it carries no value to
 * look for; a credential written by hand is the person's, and is shown as written. An OAuth2
 * level obtains its token here, which may mean a request to the token endpoint.
 */
export async function resolveAuth(input: ResolveAuthInput): Promise<ResolvedAuth> {
    const chain = authChainOf(input.chain);
    const effective = effectiveAuth([input.own, ...chain.map((level) => level.auth)]);
    const oauth = OAUTH_TYPES.has(effective.auth.type);
    const resolved = resolveTemplates(
        authTemplates(effective.auth),
        oauth ? (input.oauthScope ?? input.scope) : input.scope,
        input.secretsOff === true ? { secretsOff: () => true } : {},
    );
    const token = await tokenOf(input, effective.auth, resolved.values);
    const parts = authParts(effective.auth, resolved.values, token);
    const usedSecret = resolved.used.some((variable) => variable.secret);

    if (usedSecret) {
        rememberSessionSecrets(valuesOf(parts));
    }

    const fetched = token !== undefined && token !== REDACTED;

    return { parts, from: effective.from, carriesSecret: usedSecret || fetched };
}

/** The token an OAuth2 level asks for, renewed or cached; any other scheme has none to ask. */
async function tokenOf(
    input: ResolveAuthInput,
    auth: ConcreteAuth,
    values: Record<string, string>,
): Promise<string | undefined> {
    if (auth.type !== 'oauth2-client-credentials' && auth.type !== 'oauth2-code-pkce') {
        return undefined;
    }

    if (isUnfetched(input)) {
        return UNFETCHED_TOKEN[input.tokens];
    }

    const token = await tokenFor({
        root: input.root,
        workspaceId: input.workspaceId,
        environmentId: input.environmentId,
        auth: resolvedOAuth(auth, values),
        openExternal: openInSystemBrowser,
        signal: input.signal,
        fetch: fetchThrough(input.networkFor),
    });

    return token.accessToken;
}

/** The credentials of a signature, which travel hashed or as headers of the send itself. */
const SECRETS_OF_SIGNING: Record<AuthSigning['scheme'], readonly string[]> = {
    digest: ['password'],
    awsv4: ['accessKeyId', 'secretAccessKey', 'sessionToken'],
};

function signingValuesOf(signing: AuthSigning | undefined): string[] {
    if (signing === undefined) {
        return [];
    }

    const values: Partial<Record<string, string>> = signing;

    return SECRETS_OF_SIGNING[signing.scheme].flatMap((field) => values[field] ?? []);
}

function valuesOf(parts: AuthParts): string[] {
    return [
        ...parts.headers.map(([, value]) => value),
        ...parts.query.map(([, value]) => value),
        ...parts.cookies.map(([, value]) => value),
        ...parts.subprotocols,
        ...signingValuesOf(parts.signing),
    ];
}
