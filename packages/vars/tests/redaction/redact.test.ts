import { describe, expect, it } from 'vitest';

import { REDACTED, redact, redactSpellings, spellingsToHide } from '../../src/index.js';

describe('redacting a text', () => {
    /**
     * A value is replaced as the literal string it is. Building a pattern out of it would let
     * a token with `(` or `.` inside decide what the pattern means.
     */
    it('hides a value made of characters a regular expression would read as syntax', () => {
        const secret = 'a+b(c)?d.*e';

        expect(redact(`GET /?key=${secret}`, [secret])).toBe(`GET /?key=${REDACTED}`);
    });

    it('hides every appearance of the same value in one text', () => {
        expect(redact('tok_abcdefgh here and tok_abcdefgh there', ['tok_abcdefgh'])).toBe(
            `${REDACTED} here and ${REDACTED} there`,
        );
    });

    it('hides two different values that meet in the same text', () => {
        const text = redact('user=one_secret_value pass=other_secret', [
            'one_secret_value',
            'other_secret',
        ]);

        expect(text).toBe(`user=${REDACTED} pass=${REDACTED}`);
    });

    /** Under the threshold the marker would eat the text around it, so nothing is replaced. */
    it('leaves a value too short to hide where it is', () => {
        expect(redact('the pin is 123 today', ['123'])).toBe('the pin is 123 today');
    });

    it('gives back the text untouched when no secret is resolved', () => {
        expect(redact('nothing to hide', [])).toBe('nothing to hide');
    });

    /**
     * A secret inside a URL is not written the way the keychain keeps it: a query built with
     * `URLSearchParams` turns the space into `+`, and a path segment built with
     * `encodeURIComponent` into `%20`. Neither matches the literal, and the URL travels to the
     * response, the history and the snippets.
     */
    it('hides a secret in the three spellings a URL gives it', () => {
        const secret = 'tok en/42?';
        const asQuery = new URLSearchParams([['key', secret]]).toString();
        const asSegment = encodeURIComponent(secret);
        const text = `GET http://a.test/${asSegment}/x?${asQuery} sent ${secret}`;

        expect(redact(text, [secret])).toBe(
            `GET http://a.test/${REDACTED}/x?key=${REDACTED} sent ${REDACTED}`,
        );
    });

    it('hides the longest spelling whole before a shorter one eats a piece of it', () => {
        const secret = 'a b/c d?e';

        expect(redact(encodeURIComponent(secret), [secret])).toBe(REDACTED);
    });

    it('hides a secret with nothing to encode once, not three times', () => {
        expect(redact('x tok_abcdefgh y', ['tok_abcdefgh'])).toBe(`x ${REDACTED} y`);
    });

    it('does not hide the spellings of a value too short to hide', () => {
        expect(redact('a%20b and a+b', ['a b'])).toBe('a%20b and a+b');
    });
});

describe('spelling a list of secrets once for many texts', () => {
    it('leaves out a value too short to hide and spells each other value longest first', () => {
        expect(spellingsToHide(['123', 'tok en/42'])).toEqual([
            'tok%20en%2F42',
            'tok+en%2F42',
            'tok en/42',
        ]);
    });

    it('hides each spelling it is handed in every text it is handed', () => {
        const spellings = spellingsToHide(['tok_abcdefgh']);

        expect(redactSpellings('a tok_abcdefgh', spellings)).toBe(`a ${REDACTED}`);
        expect(redactSpellings('b tok_abcdefgh', spellings)).toBe(`b ${REDACTED}`);
    });
});
