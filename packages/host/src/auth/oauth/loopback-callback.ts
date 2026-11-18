import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import { createPlainI18n, DEFAULT_LANGUAGE, LANGUAGE_CODES, type Language } from '@mandor/i18n';

import { AuthTokenError } from '../auth-token-error.js';

const LOOPBACK_HOST = '127.0.0.1';
const CALLBACK_PATH = '/callback';

export type CallbackOptions = {
    /** 0 lets the system pick a free one. */
    port: number;
    timeoutMs: number;
    signal?: AbortSignal | undefined;
    /**
     * What the provider echoes back. Any page the person visits meanwhile can call loopback; a
     * call without this state is not the provider's, and does not end the wait.
     */
    state: string;
};

export type Callback = {
    /** What the provider is told to send the person back to. */
    redirectUri: string;
    /** What the first good call carried; a refusal when the wait ends without one. */
    parameters: Promise<URLSearchParams>;
};

/**
 * A server for one single answer: it listens on loopback only, takes the first call to
 * `/callback` that carries the state and a code or an error, thanks the person in the browser
 * and closes. The deadline and the signal of the caller close it too, as a cancellation.
 */
export async function awaitCallback(options: CallbackOptions): Promise<Callback> {
    const server = createServer();
    const port = await listen(server, options.port);
    const parameters = new Promise<URLSearchParams>((resolve, reject) => {
        const settle = (): void => {
            clearTimeout(timer);
            options.signal?.removeEventListener('abort', cancel);
        };

        const cancel = (): void => {
            settle();
            server.close();
            server.closeAllConnections();
            reject(new AuthTokenError('auth-cancelled', 'the authorization was not completed'));
        };

        const timer = setTimeout(cancel, options.timeoutMs);

        options.signal?.addEventListener('abort', cancel, { once: true });

        if (options.signal?.aborted === true) {
            cancel();
        }

        server.on('request', (request, response) => {
            const found = answer(request, response, server, options.state);

            if (found !== null) {
                settle();
                resolve(found);
            }
        });
    });

    // A flow that is cancelled while nobody awaits yet is not an unhandled rejection.
    parameters.catch(() => undefined);

    return { redirectUri: `http://${LOOPBACK_HOST}:${String(port)}${CALLBACK_PATH}`, parameters };
}

/** Replies to one call; what it carried when it was the answer, nothing when it was not. */
function answer(
    request: IncomingMessage,
    response: ServerResponse,
    server: Server,
    state: string,
): URLSearchParams | null {
    const { pathname, searchParams } = new URL(request.url ?? '/', `http://${LOOPBACK_HOST}`);

    if (request.method !== 'GET' || pathname !== CALLBACK_PATH) {
        send(response, 404, 'Not found');

        return null;
    }

    if (searchParams.get('state') !== state) {
        send(response, 400, 'Not the authorization this app asked for');

        return null;
    }

    if (!searchParams.has('code') && !searchParams.has('error')) {
        send(response, 400, 'Missing the authorization code');

        return null;
    }

    const page = createPlainI18n(pageLanguageOf(request.headers['accept-language']));

    send(response, 200, page.t('auth:loopbackReceived'), () => {
        server.closeAllConnections();
    });
    server.close();

    return searchParams;
}

/**
 * The language of the thanks: the first one the browser asks for that the app speaks. The page
 * is read in the browser, not in the window, and the browser says in which language it reads.
 */
function pageLanguageOf(accepted: string | undefined): Language {
    const asked = (accepted ?? '').split(',').map(primaryTagOf);

    for (const tag of asked) {
        const spoken = LANGUAGE_CODES.find((code) => code === tag);

        if (spoken !== undefined) {
            return spoken;
        }
    }

    return DEFAULT_LANGUAGE;
}

/** `es-PE;q=0.9` asks for `es`: the app speaks languages, not the regions of one. */
function primaryTagOf(range: string): string {
    return range.trim().split(/[-;]/)[0]?.toLowerCase() ?? '';
}

function send(response: ServerResponse, status: number, text: string, done?: () => void): void {
    response.writeHead(status, {
        'content-type': 'text/plain; charset=utf-8',
        connection: 'close',
    });
    response.end(text, done);
}

function listen(server: Server, port: number): Promise<number> {
    return new Promise((resolve, reject) => {
        server.once('error', (error) => {
            reject(
                new AuthTokenError(
                    'auth-token-failed',
                    `cannot listen for the authorization on port ${String(port)}: ${error.message}`,
                ),
            );
        });
        server.listen(port, LOOPBACK_HOST, () => {
            const address = server.address();

            // A server listening on a TCP port always answers with its address, never a pipe name.
            resolve(typeof address === 'object' && address !== null ? address.port : port);
        });
    });
}
