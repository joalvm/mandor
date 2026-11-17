import { describe, expect, it } from 'vitest';

import { tokenizeCode } from '../../src/lib/tokenize-code.js';

const BODY = '{\n  "total": 3,\n  "ok": true,\n  "to": null,\n  "a": "x"\n}';

describe('the colours of a line of code (tokenize-code)', () => {
    it('cuts a line of a list into its name, the colon and its value', () => {
        expect(tokenizeCode('Accept: text/html', false)).toEqual([
            { kind: 'key', text: 'Accept' },
            { kind: 'punctuation', text: ': ' },
            { kind: 'string', text: 'text/html' },
        ]);
    });

    it('reads any other short value whole, as a string', () => {
        expect(tokenizeCode('https://api.test/v2?a=1', false)).toEqual([
            { kind: 'string', text: 'https://api.test/v2?a=1' },
        ]);
    });

    it('cuts a laid-out structure by the grammar of JSON and loses no character', () => {
        const tokens = tokenizeCode(BODY, true);

        expect(tokens.filter(({ kind }) => kind !== 'plain' && kind !== 'punctuation')).toEqual([
            { kind: 'key', text: '"total"' },
            { kind: 'number', text: '3' },
            { kind: 'key', text: '"ok"' },
            { kind: 'literal', text: 'true' },
            { kind: 'key', text: '"to"' },
            { kind: 'literal', text: 'null' },
            { kind: 'key', text: '"a"' },
            { kind: 'string', text: '"x"' },
        ]);
        expect(tokens.map(({ text }) => text).join('')).toBe(BODY);
    });

    it('reads a short body that opens like JSON by the grammar of JSON', () => {
        expect(tokenizeCode('{"total":3}', false)).toContainEqual({ kind: 'number', text: '3' });
    });

    it('keeps a quote that is escaped inside its string', () => {
        expect(tokenizeCode('["a\\"b"]', true)).toContainEqual({
            kind: 'string',
            text: '"a\\"b"',
        });
    });

    it('keeps what it cannot tell as plain text', () => {
        expect(tokenizeCode('oops', true)).toEqual([{ kind: 'plain', text: 'oops' }]);
    });
});
