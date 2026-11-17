import {
    environmentScope,
    globalValuesOf,
    type EnvironmentPlace,
    type EnvironmentScope,
    type NetworkFor,
    resolveAuth,
    variableScopeOf,
} from '@mandor/host';
import type { WsOpenRequest } from '@mandor/ipc';
import type { ConnectionTransport } from '@mandor/schema';
import {
    assertSafeAuthority,
    resolveTemplates,
    resolveText,
    scriptGuard,
    type ScriptGuardVerdict,
    type VariableScope,
} from '@mandor/vars';

import { wroteHandshake, writtenKeys, type ConnectionTemplate } from './connection-effects.js';
import type { ConnectionGuard } from './before-connect.js';
import type { SocketOpenRequest } from './socket-manager.js';
import {
    definedOf,
    handshakeHeaders,
    headersWithAuth,
    handshakeParams,
    socketioFieldsOf,
    subprotocolsField,
    templatesOf,
    urlWithAuthQuery,
} from './ws-open-parts.js';

/**
 * Why a socket lives with its secrets off: a script moved where it goes, or shaped the handshake
 * of a Socket.IO that may ride polling, which follows a redirect with every header.
 */
export type SecretsOff = 'destination' | 'polling' | null;

export type ResolvedWsOpen = {
    environmentId: string | null;
    request: SocketOpenRequest;
    secretsOff: SecretsOff;
    /** The secrets the handshake left as their name, because a script had a hand in it. */
    withheld: string[];
};

/** The scheme gate of one transport: websocket and Socket.IO are asserted apart. */
export type AssertSocketUrl = (transport: ConnectionTransport, value: string) => URL;

/** What main alone answers of an open: the scheme of its url and the network that carries it. */
export type OpenGate = { assertUrl: AssertSocketUrl; networkFor: NetworkFor };

type Handshake = {
    values: Record<string, string>;
    composed: VariableScope;
    secretsOff: SecretsOff;
    withheld: string[];
};

/** The `Host` line resolves to another value once the script level takes part. */
function hostMoved(template: ConnectionTemplate, base: VariableScope, scope: VariableScope) {
    const host = Object.entries(template.headers ?? {}).find(
        ([name]) => name.toLowerCase() === 'host',
    )?.[1];

    return host !== undefined && resolveText(host, base).text !== resolveText(host, scope).text;
}

/** A Socket.IO dials by polling unless it was told websocket alone, the default of the client. */
function secretsOffOf(verdict: ScriptGuardVerdict, input: WsOpenRequest): SecretsOff {
    if (verdict.destinationMoved) {
        return 'destination';
    }

    const polls =
        input.transport === 'socketio' && input.socketio?.engineTransport !== 'websocket-only';

    return verdict.influenced && polls ? 'polling' : null;
}

/**
 * The rule of destination over a handshake. With no value of a script and nothing written, it
 * resolves as it always did. Otherwise a line a script wrote resolves with secrets off; and when
 * the destination moved, or a script shaped a Socket.IO that may poll, the whole socket does.
 */
function guardedHandshake(
    guard: ConnectionGuard,
    templates: Record<string, string>,
    input: WsOpenRequest,
): Handshake {
    const composed = variableScopeOf(guard.scope, guard.script);
    const written = wroteHandshake(guard.applied);

    if (!written && Object.keys(guard.script).length === 0) {
        const { values } = resolveTemplates(templates, composed);

        return { values, composed, secretsOff: null, withheld: [] };
    }

    const base = variableScopeOf(guard.scope);
    const keys = writtenKeys(guard.applied);
    const first = resolveTemplates(templates, composed, { secretsOff: (key) => keys.has(key) });
    const verdict = scriptGuard({
        base: resolveText(guard.base.url, base).text,
        final: first.values['url'] ?? '',
        wroteHost: guard.applied.wroteHost,
        hostMoved: hostMoved(guard.applied.template, base, composed),
        written,
        used: first.used,
    });
    const secretsOff = secretsOffOf(verdict, input);
    const sent =
        secretsOff === null
            ? first
            : resolveTemplates(templates, composed, { secretsOff: () => true });

    return { values: sent.values, composed, secretsOff, withheld: sent.withheld ?? [] };
}

type AuthOf = {
    place: EnvironmentPlace;
    input: WsOpenRequest;
    scope: EnvironmentScope;
    handshake: Handshake;
    networkFor: NetworkFor;
};

/**
 * The auth of the handshake. A connection is not in the collection: its chain has no folders, so
 * it is the workspace or the auth the connection carries itself. A socket that lives with its
 * secrets off resolves it off and asks no token; an OAuth2 level never sees what scripts set.
 */
function authOf(run: AuthOf, guarded: boolean) {
    const { place, input, scope, handshake, networkFor } = run;
    const off = handshake.secretsOff !== null;

    return resolveAuth({
        root: place.root,
        workspaceId: input.workspaceId,
        own: input.template.auth,
        chain: scope.chain,
        scope: handshake.composed,
        environmentId: input.environmentId,
        ...(guarded ? { oauthScope: variableScopeOf(scope), secretsOff: off } : {}),
        ...(off ? { tokens: 'none' } : { networkFor }),
    });
}

export async function resolveWsOpen(
    place: EnvironmentPlace,
    input: WsOpenRequest,
    gate: OpenGate,
    guard?: ConnectionGuard,
): Promise<ResolvedWsOpen> {
    // The environment of the connection and nobody else's: what the workspace has active is of
    // the other window, and a socket that borrowed it would resolve against a choice nobody
    // made here.
    const environmentId = input.environmentId;
    // A connection is not in the collection: no folder of the tree resolves its url or headers.
    const scope =
        guard?.scope ?? (await environmentScope(place, input.workspaceId, environmentId, null));
    const template = guard?.applied.template ?? input.template;

    assertSafeAuthority(template.url, scope.environment, scope.secrets, {
        below: globalValuesOf(scope),
        ...(guard === undefined ? {} : { script: guard.script }),
    });

    const templates = templatesOf(template);
    const handshake =
        guard === undefined
            ? {
                  values: resolveTemplates(templates, variableScopeOf(scope)).values,
                  composed: variableScopeOf(scope),
                  secretsOff: null,
                  withheld: [],
              }
            : guardedHandshake(guard, templates, input);
    const url = handshake.values['url'] ?? '';

    gate.assertUrl(input.transport, url);

    const { networkFor } = gate;
    const { parts } = await authOf(
        { place, input, scope, handshake, networkFor },
        guard !== undefined,
    );

    return {
        environmentId,
        secretsOff: handshake.secretsOff,
        withheld: handshake.withheld,
        request: {
            connectionId: input.connectionId,
            transport: input.transport,
            url: urlWithAuthQuery(url, [
                ...handshakeParams(handshake.values, template),
                ...parts.query,
            ]),
            headers: headersWithAuth(handshakeHeaders(handshake.values), parts.headers),
            ...socketioFieldsOf(input.socketio),
            ...subprotocolsField(input, parts),
            ...definedOf(input, [
                'maximumMessageSizeBytes',
                'verifyCertificate',
                'handshakeTimeoutMs',
                'reconnect',
                'keepalive',
            ]),
        },
    };
}
