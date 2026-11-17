import { describe, expect, it } from 'vitest';

import { followRedirects } from '../../src/redirect/follow-redirects.js';
import type { SyncRequest } from '../../src/request/sync-request.js';
import { at, headerOf, memoryJar, request, response } from '../support/cookie-fixtures.js';

describe('followRedirects with a jar', () => {
    it('carries a cookie a 302 sets to the same origin, and not to another one', async () => {
        const jar = memoryJar();
        const seen: SyncRequest[] = [];
        const answers = [
            response(302, [
                ['location', '/me'],
                ['set-cookie', 'sid=abc; Path=/'],
            ]),
            response(302, [['location', 'https://other.test/']]),
            response(200),
        ];

        await followRedirects(request('https://a.test/login', { cookies: jar }), (one) => {
            seen.push(one);

            return Promise.resolve(at(answers, seen.length - 1));
        });

        expect(headerOf(at(seen, 0), 'cookie')).toBeUndefined();
        expect(headerOf(at(seen, 1), 'cookie')).toBe('sid=abc');
        expect(headerOf(at(seen, 2), 'cookie')).toBeUndefined();
    });

    it('stores the Set-Cookie of every hop, the redirecting ones included', async () => {
        const jar = memoryJar();
        const answers = [
            response(301, [
                ['location', '/b'],
                ['set-cookie', 'one=1'],
            ]),
            response(200, [['set-cookie', 'two=2']]),
        ];
        let calls = 0;

        await followRedirects(request('https://a.test/a', { cookies: jar }), () =>
            Promise.resolve(at(answers, calls++)),
        );

        expect(jar.stored).toEqual([
            ['https://a.test/a', ['one=1']],
            ['https://a.test/b', ['two=2']],
        ]);
    });
});
