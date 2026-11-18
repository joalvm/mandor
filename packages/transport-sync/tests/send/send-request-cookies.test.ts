import { afterEach, describe, expect, it } from 'vitest';

import { sendRequest } from '../../src/send/send-request.js';
import { type EchoServer, startEchoServer } from '../support/http-server.js';

let server: EchoServer;

afterEach(async () => {
    await server.close();
});

describe('sendRequest with a jar over the wire', () => {
    it('hands the jar each Set-Cookie line the server sent, unfolded', async () => {
        server = await startEchoServer();

        const stored: (readonly string[])[] = [];

        await sendRequest(
            {
                method: 'GET',
                url: `${server.origin}/`,
                headers: [],
                spill: {
                    open: () => Promise.reject(new Error('the spill must not open')),
                    thresholdBytes: 1 << 20,
                },
                timeouts: { connectMs: 2_000, totalMs: 5_000 },
                tls: { verify: false },
                redirects: { follow: true, max: 5 },
                cookies: {
                    header: () => Promise.resolve(null),
                    store: (_url, setCookies) => {
                        stored.push(setCookies);

                        return Promise.resolve();
                    },
                },
            },
            new AbortController().signal,
        );

        expect(stored).toEqual([['first=1; Path=/', 'second=2; Path=/']]);
    });
});
