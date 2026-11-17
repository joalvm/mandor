import { describe, expect, it } from 'vitest';

import { followRedirects } from '../../src/redirect/follow-redirects.js';
import type { SyncRequest } from '../../src/request/sync-request.js';
import { at, headerOf, request, response } from '../support/cookie-fixtures.js';

describe('followRedirects with credentials worked out per hop', () => {
    it('answers a Digest challenge on each hop of the origin, and not past it', async () => {
        const seen: SyncRequest[] = [];
        const challenge: [string, string] = ['WWW-Authenticate', 'Digest realm="r", nonce="n"'];
        const answers = [
            response(401, [challenge]),
            response(302, [['location', 'https://other.test/']]),
            response(401, [challenge]),
        ];

        const last = await followRedirects(
            request('https://a.test/', {
                auth: { scheme: 'digest', username: 'ana', password: 'secret' },
            }),
            (one) => {
                seen.push(one);

                return Promise.resolve(at(answers, seen.length - 1));
            },
        );

        expect(last.response.status).toBe(401);
        expect(headerOf(at(seen, 0), 'authorization')).toBeUndefined();
        expect(headerOf(at(seen, 1), 'authorization')).toMatch(/^Digest username="ana"/);
        expect(headerOf(at(seen, 2), 'authorization')).toBeUndefined();
    });

    it('signs the first hop with AWS Signature Version 4 at the time of the send', async () => {
        const seen: SyncRequest[] = [];

        await followRedirects(
            request('https://sqs.eu-west-1.amazonaws.com/', {
                auth: { scheme: 'awsv4', accessKeyId: 'AK', secretAccessKey: 'SK' },
            }),
            (one) => {
                seen.push(one);

                return Promise.resolve(response(200));
            },
        );

        expect(headerOf(at(seen, 0), 'x-amz-date')).toMatch(/^\d{8}T\d{6}Z$/);
        expect(headerOf(at(seen, 0), 'authorization')).toMatch(/^AWS4-HMAC-SHA256 /);
    });
});
