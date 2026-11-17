import { describe, expect, it } from 'vitest';

import { followRedirects } from '../../src/redirect/follow-redirects.js';
import type { RedirectHop } from '../../src/redirect/redirect-hop.js';
import { SyncSendError } from '../../src/send/sync-send-error.js';
import type { SyncRequest } from '../../src/request/sync-request.js';
import type { SyncResponse } from '../../src/response/sync-response.js';

function request(url: string, overrides: Partial<SyncRequest> = {}): SyncRequest {
    const base: SyncRequest = {
        method: 'GET',
        url,
        headers: [],
        spill: {
            open: () => Promise.reject(new Error('the spill must not open')),
            thresholdBytes: 1 << 20,
        },
        timeouts: { connectMs: 1_000, totalMs: 5_000 },
        tls: { verify: false },
        redirects: { follow: true, max: 5 },
    };

    return Object.assign(base, overrides);
}

function response(status: number, location?: string): SyncResponse {
    return {
        status,
        statusText: 'Moved',
        httpVersion: '1.1',
        headers: location === undefined ? [] : [['location', location]],
        body: { kind: 'inline', bytes: new TextEncoder().encode('redirecting') },
        sizes: {
            transferredBytes: 11,
            bodyBytes: 11,
            decoded: false,
            headerBytes: 0,
            requestHeaderBytes: 0,
            requestBodyBytes: 0,
        },
        timings: { dnsMs: 1, connectMs: 1, tlsMs: 0, firstByteMs: 1, totalMs: 3, viaProxy: false },
        redirects: [],
    };
}

/** The scripted sender: every call answers the next response of the list and records what arrived. */
function scriptOf(...answers: SyncResponse[]) {
    const seen: SyncRequest[] = [];

    return {
        seen,
        send: (request: SyncRequest): Promise<SyncResponse> => {
            seen.push(request);

            const answer = answers.at(Math.min(seen.length - 1, answers.length - 1));

            if (answer === undefined) {
                throw new Error('the script ran out of answers');
            }

            return Promise.resolve(answer);
        },
    };
}

describe('followRedirects', () => {
    it('returns a 3xx untouched when the request says do not follow', async () => {
        const actor = scriptOf(response(302, '/next'));
        const outcome = await followRedirects(
            request('http://a.test/one', { redirects: { follow: false, max: 5 } }),
            actor.send,
        );

        expect(outcome.response.status).toBe(302);
        expect(outcome.hops).toEqual([]);
        expect(actor.seen).toHaveLength(1);
    });

    it('follows a chain and carries every hop', async () => {
        const actor = scriptOf(
            response(302, '/two'),
            response(301, 'http://a.test/three'),
            response(200),
        );
        const outcome = await followRedirects(request('http://a.test/one'), actor.send);
        const hops: RedirectHop[] = outcome.hops;

        expect(outcome.response.status).toBe(200);
        expect(hops).toEqual([
            {
                status: 302,
                from: 'http://a.test/one',
                to: 'http://a.test/two',
                strippedHeaders: [],
            },
            {
                status: 301,
                from: 'http://a.test/two',
                to: 'http://a.test/three',
                strippedHeaders: [],
            },
        ]);
        expect(actor.seen).toHaveLength(3);
    });

    it('fails with redirect-limit when the chain passes the maximum', async () => {
        const loop = response(302, '/loop');
        const actor = scriptOf(loop);
        const error = await followRedirects(
            request('http://a.test/one', { redirects: { follow: true, max: 2 } }),
            actor.send,
        ).catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(SyncSendError);
        expect((error as SyncSendError).reason).toBe('redirect-limit');
    });

    it('returns the 3xx as-is when the response carries no location', async () => {
        const actor = scriptOf(response(302));
        const outcome = await followRedirects(request('http://a.test/one'), actor.send);
        const hops: RedirectHop[] = outcome.hops;

        expect(outcome.response.status).toBe(302);
        expect(hops).toEqual([]);
    });

    it('sends the follow-up without the credentials of the first origin', async () => {
        const actor = scriptOf(response(302, 'http://b.test/two'), response(200));
        const outcome = await followRedirects(
            request('http://a.test/one', {
                headers: [
                    ['authorization', 'Bearer t'],
                    ['proxy-authorization', 'Basic p'],
                    ['cookie', 'a=1'],
                ],
            }),
            actor.send,
        );

        expect(outcome.hops[0]?.strippedHeaders).toEqual([
            'authorization',
            'proxy-authorization',
            'cookie',
        ]);
        expect(actor.seen[1]?.headers).toEqual([]);
    });

    it('stops a location the transport does not dial', async () => {
        const reason = 'redirect-scheme';
        const actor = scriptOf(response(302, 'file:///etc/passwd'));
        const from = request('https://a.test/one');
        const error = await followRedirects(from, actor.send).catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(SyncSendError);
        expect((error as SyncSendError).reason).toBe(reason);
    });
});
