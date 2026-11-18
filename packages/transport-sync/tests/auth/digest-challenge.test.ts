import { describe, expect, it } from 'vitest';

import { digestChallengeOf } from '../../src/auth/digest-challenge.js';

describe('reading a Digest challenge', () => {
    it('reads the parameters of the challenge, quoted or bare, by lower-case name', () => {
        expect(
            digestChallengeOf([
                ['Content-Type', 'text/plain'],
                [
                    'WWW-Authenticate',
                    'Digest realm="a \\"b\\"", qop="auth,auth-int", Algorithm=SHA-256, nonce="n"',
                ],
            ]),
        ).toEqual({ realm: 'a "b"', qop: 'auth,auth-int', algorithm: 'SHA-256', nonce: 'n' });
    });

    it('finds the Digest challenge among others, in its own header or after another scheme', () => {
        expect(
            digestChallengeOf([
                ['www-authenticate', 'Basic realm="x"'],
                ['www-authenticate', 'Bearer, digest realm="r", nonce="n", Basic realm="y"'],
            ]),
        ).toEqual({ realm: 'r', nonce: 'n' });
    });

    it('answers nothing when no challenge is a Digest one', () => {
        expect(digestChallengeOf([['WWW-Authenticate', 'Basic realm="x"']])).toBeUndefined();
        expect(digestChallengeOf([])).toBeUndefined();
    });
});
