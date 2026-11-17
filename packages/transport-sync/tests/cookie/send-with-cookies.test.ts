import { describe, expect, it } from 'vitest';

import { sendWithCookies } from '../../src/cookie/send-with-cookies.js';
import type { SyncRequest } from '../../src/request/sync-request.js';
import { at, headerOf, memoryJar, request, response } from '../support/cookie-fixtures.js';

describe('sendWithCookies', () => {
    it('sends the request as it is when there is no jar', async () => {
        const seen: SyncRequest[] = [];
        const original = request('https://a.test/');

        await sendWithCookies(original, (one) => {
            seen.push(one);

            return Promise.resolve(response(200));
        });

        expect(seen).toEqual([original]);
    });

    it('adds what the jar holds for the URL and keeps what the answer sets', async () => {
        const jar = memoryJar();
        const seen: SyncRequest[] = [];

        await jar.store('https://a.test/', ['sid=abc; Path=/']);
        jar.stored.length = 0;

        await sendWithCookies(request('https://a.test/me', { cookies: jar }), (one) => {
            seen.push(one);

            return Promise.resolve(
                response(200, [
                    ['set-cookie', 'theme=dark'],
                    ['Set-Cookie', 'lang=es'],
                ]),
            );
        });

        expect(headerOf(at(seen, 0), 'cookie')).toBe('sid=abc');
        expect(jar.stored).toEqual([['https://a.test/me', ['theme=dark', 'lang=es']]]);
    });

    it('puts the jar after the cookie written by hand, in one header', async () => {
        const jar = memoryJar();
        const seen: SyncRequest[] = [];

        await jar.store('https://a.test/', ['sid=abc']);

        await sendWithCookies(
            request('https://a.test/', { cookies: jar, headers: [['Cookie', 'mine=1']] }),
            (one) => {
                seen.push(one);

                return Promise.resolve(response(200));
            },
        );

        expect(seen[0]?.headers.filter(([key]) => key.toLowerCase() === 'cookie')).toEqual([
            ['Cookie', 'mine=1; sid=abc'],
        ]);
    });

    it('hands cookies.store an empty list when the answer sets nothing', async () => {
        const jar = memoryJar();

        await sendWithCookies(request('https://a.test/', { cookies: jar }), () =>
            Promise.resolve(response(204)),
        );

        expect(jar.stored).toEqual([['https://a.test/', []]]);
    });
});
