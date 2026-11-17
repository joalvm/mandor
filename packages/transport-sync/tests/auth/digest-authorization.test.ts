import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { digestAuthorization } from '../../src/auth/digest-authorization.js';

function md5(text: string): string {
    return createHash('md5').update(text).digest('hex');
}

/** The exchange of RFC 2617 §3.5: Mufasa asks for /dir/index.html. */
const RFC_2617 = {
    realm: 'testrealm@host.com',
    qop: 'auth,auth-int',
    nonce: 'dcd98b7102dd2f0e8b11d0f600bfb0c093',
    opaque: '5ccc069c403ebaf9f0171e9517f40e41',
};

function asked(overrides: Partial<Parameters<typeof digestAuthorization>[0]> = {}) {
    return {
        method: 'GET',
        uri: '/dir/index.html',
        body: undefined,
        username: 'Mufasa',
        password: 'Circle Of Life',
        cnonce: '0a4f113b',
        ...overrides,
    };
}

describe('answering a Digest challenge', () => {
    it('answers the RFC 2617 example with its documented response', () => {
        expect(digestAuthorization(asked(), RFC_2617)).toBe(
            'Digest username="Mufasa", realm="testrealm@host.com", ' +
                'nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", uri="/dir/index.html", ' +
                'response="6629fae49393a05397450978507c4ef1", qop=auth, nc=00000001, ' +
                'cnonce="0a4f113b", opaque="5ccc069c403ebaf9f0171e9517f40e41"',
        );
    });

    it('answers the SHA-256 example of RFC 7616 with its documented response', () => {
        const answer = digestAuthorization(
            asked({
                password: 'Circle of Life',
                cnonce: 'f2/wE4q74E6zIJEtWaHKaf5wv/H5QzzpXusqGemxURZJ',
            }),
            {
                realm: 'http-auth@example.org',
                qop: 'auth, auth-int',
                algorithm: 'SHA-256',
                nonce: '7ypf/xlj9XXwfDPEoM4URrv/xwf94BcCAzFZH4GiTo0v',
                opaque: 'FQhe/qaU925kfnzjCev0ciny7QMkPqMAFRtzCUYo5tdS',
            },
        );

        expect(answer).toContain(
            'response="753927fa0e85d155564e2e272a28d1802ca10daf4496794697cf8db5856cb6c1"',
        );
        expect(answer).toContain('algorithm=SHA-256');
    });

    it('answers a challenge without qop the way RFC 2069 did, with no count or cnonce', () => {
        const answer = digestAuthorization(asked(), { realm: 'r', nonce: 'n' });
        const expected = md5(`${md5('Mufasa:r:Circle Of Life')}:n:${md5('GET:/dir/index.html')}`);

        expect(answer).toBe(
            `Digest username="Mufasa", realm="r", nonce="n", uri="/dir/index.html", response="${expected}"`,
        );
    });

    it('hashes the session key once more for a -sess algorithm', () => {
        const answer = digestAuthorization(asked(), {
            realm: 'r',
            nonce: 'n',
            qop: 'auth',
            algorithm: 'MD5-sess',
        });
        const key = md5(`${md5('Mufasa:r:Circle Of Life')}:n:0a4f113b`);
        const expected = md5(`${key}:n:00000001:0a4f113b:auth:${md5('GET:/dir/index.html')}`);

        expect(answer).toContain(`response="${expected}"`);
    });

    it('hashes the body into the answer when the server only offers auth-int', () => {
        const answer = digestAuthorization(
            asked({ method: 'POST', body: new TextEncoder().encode('hi') }),
            { realm: 'r', nonce: 'n', qop: 'auth-int' },
        );
        const part = md5(`POST:/dir/index.html:${md5('hi')}`);
        const expected = md5(
            `${md5('Mufasa:r:Circle Of Life')}:n:00000001:0a4f113b:auth-int:${part}`,
        );

        expect(answer).toContain(`response="${expected}"`);
        expect(answer).toContain('qop=auth-int');
    });

    it('hashes an empty body for auth-int, and answers an empty realm the server left out', () => {
        const answer = digestAuthorization(asked(), { nonce: 'n', qop: 'auth-int' });
        const part = md5(`GET:/dir/index.html:${md5('')}`);
        const expected = md5(
            `${md5('Mufasa::Circle Of Life')}:n:00000001:0a4f113b:auth-int:${part}`,
        );

        expect(answer).toContain(`realm="", nonce="n"`);
        expect(answer).toContain(`response="${expected}"`);
    });

    it('answers an empty nonce the server left out', () => {
        expect(digestAuthorization(asked(), { realm: 'r' })).toContain('nonce=""');
    });

    it('escapes the quotes and backslashes of a username', () => {
        expect(digestAuthorization(asked({ username: 'a"b\\c' }), RFC_2617)).toContain(
            'username="a\\"b\\\\c"',
        );
    });

    it('answers nothing to an algorithm it does not know', () => {
        expect(digestAuthorization(asked(), { ...RFC_2617, algorithm: 'SHA-1' })).toBeUndefined();
    });
});
