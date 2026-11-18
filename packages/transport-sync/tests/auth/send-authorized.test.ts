import { describe, expect, it } from 'vitest';

import { sendAuthorized, type AuthClock } from '../../src/auth/send-authorized.js';
import type { SyncRequest } from '../../src/request/sync-request.js';
import type { SyncResponse } from '../../src/response/sync-response.js';
import { at, headerOf, request, response } from '../support/cookie-fixtures.js';

const CLOCK: AuthClock = { now: () => new Date('2026-10-15T08:00:00Z'), cnonce: () => 'c0ffee' };

const DIGEST = { scheme: 'digest', username: 'ana', password: 'secret' } as const;

const CHALLENGE: [string, string] = ['WWW-Authenticate', 'Digest realm="r", nonce="n", qop="auth"'];

/** A server of answers in order, which notes every request that reaches it. */
function answering(...answers: SyncResponse[]) {
    const seen: SyncRequest[] = [];
    const send = (one: SyncRequest): Promise<SyncResponse> => {
        seen.push(one);

        return Promise.resolve(at(answers, seen.length - 1));
    };

    return { seen, send };
}

describe('sending with the credentials the request works out', () => {
    it('sends a request without auth as it is', async () => {
        const server = answering(response(200));
        const plain = request('https://a.test/');

        await sendAuthorized(plain, 'https://a.test', server.send, CLOCK);

        expect(server.seen).toEqual([plain]);
    });

    it('signs every request of the origin with AWS Signature Version 4', async () => {
        const server = answering(response(200));
        const auth = { scheme: 'awsv4', accessKeyId: 'AK', secretAccessKey: 'SK' } as const;

        await sendAuthorized(
            request('https://sqs.eu-west-1.amazonaws.com/', { auth }),
            'https://sqs.eu-west-1.amazonaws.com',
            server.send,
            CLOCK,
        );

        expect(headerOf(at(server.seen, 0), 'x-amz-date')).toBe('20261015T080000Z');
        expect(headerOf(at(server.seen, 0), 'authorization')).toMatch(/^AWS4-HMAC-SHA256 /);
    });

    it('answers the Digest challenge of a 401 and sends the request once more', async () => {
        const server = answering(response(401, [CHALLENGE]), response(200));

        const answered = await sendAuthorized(
            request('https://a.test/me?x=1', { auth: DIGEST }),
            'https://a.test',
            server.send,
            CLOCK,
        );

        expect(answered.status).toBe(200);
        expect(server.seen).toHaveLength(2);
        expect(headerOf(at(server.seen, 0), 'authorization')).toBeUndefined();
        expect(headerOf(at(server.seen, 1), 'authorization')).toMatch(
            /^Digest username="ana", realm="r", nonce="n", uri="\/me\?x=1", .*cnonce="c0ffee"$/,
        );
    });

    it('hands back the first answer when it is no Digest challenge it can answer', async () => {
        for (const first of [
            response(200),
            response(401, [['WWW-Authenticate', 'Basic realm="r"']]),
            response(401, [['WWW-Authenticate', 'Digest realm="r", nonce="n", algorithm=SHA-1']]),
        ]) {
            const server = answering(first);

            await expect(
                sendAuthorized(
                    request('https://a.test/', { auth: DIGEST }),
                    'https://a.test',
                    server.send,
                    CLOCK,
                ),
            ).resolves.toBe(first);
            expect(server.seen).toHaveLength(1);
        }
    });

    it('carries no credential to another origin, and none over an Authorization written by hand', async () => {
        const auth = { scheme: 'awsv4', accessKeyId: 'AK', secretAccessKey: 'SK' } as const;
        const elsewhere = request('https://b.test/', { auth });
        const written = request('https://a.test/', {
            auth,
            headers: [['authorization', 'mine']],
        });
        const server = answering(response(200), response(200));

        await sendAuthorized(elsewhere, 'https://a.test', server.send, CLOCK);
        await sendAuthorized(written, 'https://a.test', server.send, CLOCK);

        expect(server.seen).toEqual([elsewhere, written]);
    });
});
