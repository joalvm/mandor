import { describe, expect, it } from 'vitest';

import { answerSpellings } from '../../src/redaction/answer-spellings.js';
import { REDACTED, redactSpellings } from '../../src/redaction/redact.js';

function hidden(text: string, secrets: readonly string[]): string {
    return redactSpellings(text, answerSpellings(secrets));
}

describe('the spellings a secret takes in what a server answers', () => {
    it('hides a value of any length, even the shortest', () => {
        expect(hidden('{"pin":"123","year":"2123"}', ['123'])).toBe(
            `{"pin":"${REDACTED}","year":"2${REDACTED}"}`,
        );
    });

    it('hides it as base64, with its padding or without', () => {
        expect(hidden('a=c2VjcmV0MTI=', ['secret12'])).toBe(`a=${REDACTED}`);
        expect(hidden('a=c2VjcmV0MTI', ['secret12'])).toBe(`a=${REDACTED}`);
    });

    it('hides it in the alphabet base64 has inside a url', () => {
        expect(hidden('a=77+v', ['￯'])).toBe(`a=${REDACTED}`);
        expect(hidden('a=77-v', ['￯'])).toBe(`a=${REDACTED}`);
    });

    it('hides it with the escapes of a JSON string', () => {
        expect(hidden('{"echo":"a\\"b\\\\c"}', ['a"b\\c'])).toBe(`{"echo":"${REDACTED}"}`);
    });

    it('hides it as a url spells it', () => {
        expect(hidden('/x?q=a+b%26', ['a b&'])).toBe(`/x?q=${REDACTED}`);
        expect(hidden('/x/a%20b%26', ['a b&'])).toBe(`/x/${REDACTED}`);
    });

    it('takes a longer secret before a shorter one that is a piece of it', () => {
        expect(hidden('long-secret', ['secret', 'long-secret'])).toBe(REDACTED);
    });

    it('has nothing to look for in an empty value', () => {
        expect(answerSpellings([''])).toEqual([]);
    });

    it('takes a character outside the latin alphabet whole', () => {
        expect(hidden('clave ñandú', ['ñandú'])).toBe(`clave ${REDACTED}`);
        expect(hidden('w7FhbmTDug==', ['ñandú'])).toBe(REDACTED);
    });
});
