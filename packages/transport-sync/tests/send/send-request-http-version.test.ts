import { afterEach, describe, expect, it } from 'vitest';

import type { SyncRequest } from '../../src/request/sync-request.js';
import { sendRequest } from '../../src/send/send-request.js';
import type { SyncSendError } from '../../src/send/sync-send-error.js';
import { startH2Server } from '../support/h2-server.js';
import { startEchoServer } from '../support/http-server.js';

let close: () => Promise<void> = () => Promise.resolve();

afterEach(async () => {
    await close();
});

function request(url: string, httpVersion: SyncRequest['httpVersion']): SyncRequest {
    return {
        method: 'GET',
        url,
        headers: [],
        httpVersion,
        spill: {
            open: () => Promise.reject(new Error('the spill must not open')),
            thresholdBytes: 1 << 20,
        },
        timeouts: { connectMs: 2_000, totalMs: 5_000 },
        tls: { verify: false },
        redirects: { follow: true, max: 5 },
    };
}

function reasonOf(url: string, httpVersion: SyncRequest['httpVersion']): Promise<string> {
    return sendRequest(request(url, httpVersion), new AbortController().signal).then(
        () => 'answered',
        (error: unknown) => (error as SyncSendError).reason,
    );
}

describe('sendRequest held to one HTTP version', () => {
    it('speaks HTTP/1.1 to a server that would take h2 when the request asks for http1', async () => {
        const server = await startH2Server({ allowHTTP1: true });

        close = () => server.close();
        const response = await sendRequest(
            request(`${server.origin}/`, 'http1'),
            new AbortController().signal,
        );

        expect(response.httpVersion).toBe('1.1');
    });

    it('speaks h2 when the request demands it and the server does', async () => {
        const server = await startH2Server();

        close = () => server.close();
        const response = await sendRequest(
            request(`${server.origin}/`, 'http2'),
            new AbortController().signal,
        );

        expect(response.httpVersion).toBe('2');
    });

    it('dies with http-version on a TLS server that does not answer h2', async () => {
        const server = await startEchoServer({ https: true });

        close = () => server.close();

        await expect(reasonOf(`${server.origin}/`, 'http2')).resolves.toBe('http-version');
    });

    it('dies with http-version on a plain http URL: there is no h2 without TLS', async () => {
        const server = await startEchoServer();

        close = () => server.close();

        await expect(reasonOf(`${server.origin}/`, 'http2')).resolves.toBe('http-version');
    });
});
