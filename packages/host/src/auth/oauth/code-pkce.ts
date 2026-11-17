import {
    authorizationCodeGrantRequest,
    calculatePKCECodeChallenge,
    generateRandomCodeVerifier,
    generateRandomState,
    processAuthorizationCodeResponse,
    validateAuthResponse,
} from 'oauth4webapi';

import type { OAuth2CodePkce } from '@mandor/schema';

import {
    authorizationServerOf,
    requestOptionsOf,
    type TokenFetch,
} from './authorization-server-of.js';
import { authorizationUrlOf } from './authorization-url.js';
import { clientAuthenticationOf } from './client-authentication.js';
import { awaitCallback } from './loopback-callback.js';
import { storedTokenOf, type StoredToken } from './stored-token.js';
import { tokenFailure } from './token-failure.js';

/** Long enough for a person to sign in, with a second factor, in a browser that was closed. */
const DEFAULT_TIMEOUT_MS = 300_000;

export type CodePkceOptions = {
    /** Opens a url in the browser of the system: injected so no test needs Electron. */
    openExternal: (url: string) => Promise<void>;
    signal?: AbortSignal | undefined;
    timeoutMs?: number | undefined;
    /** The network the code is traded by; without one, the global fetch of the runtime. */
    fetch?: TokenFetch | undefined;
};

/**
 * Authorization code with PKCE, the way a desktop app does it: the browser of the system asks
 * the person, a loopback server of one single answer receives the code, and the code is traded
 * for the token. The level comes resolved.
 */
export async function requestCodePkce(
    auth: OAuth2CodePkce,
    options: CodePkceOptions,
): Promise<StoredToken> {
    // Whatever ends the flow, early or late, closes the loopback server it opened.
    const flow = new AbortController();
    const signal =
        options.signal === undefined ? flow.signal : AbortSignal.any([options.signal, flow.signal]);

    try {
        // Both endpoints are vetted before a port opens or a browser is asked.
        const endpoint = authorizationServerOf({
            tokenUrl: auth.tokenUrl,
            authorizationUrl: auth.authorizationUrl,
        });
        const verifier = generateRandomCodeVerifier();
        const state = generateRandomState();
        const callback = await awaitCallback({
            port: auth.redirectPort ?? 0,
            timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
            signal,
            state,
        });
        const url = authorizationUrlOf({
            authorizationUrl: auth.authorizationUrl,
            clientId: auth.clientId,
            redirectUri: callback.redirectUri,
            scope: auth.scope,
            state,
            codeChallenge: await calculatePKCECodeChallenge(verifier),
        });

        await options.openExternal(url.href);

        const client = { client_id: auth.clientId };
        const parameters = validateAuthResponse(
            endpoint.server,
            client,
            await callback.parameters,
            state,
        );
        const response = await authorizationCodeGrantRequest(
            endpoint.server,
            client,
            clientAuthenticationOf(auth),
            parameters,
            callback.redirectUri,
            verifier,
            requestOptionsOf(endpoint, signal, options.fetch),
        );

        return storedTokenOf(
            await processAuthorizationCodeResponse(endpoint.server, client, response),
            Date.now(),
        );
    } catch (error) {
        throw tokenFailure(error);
    } finally {
        flow.abort();
    }
}
