import { editor } from 'monaco-editor/editor/editor.api.js';
import { describe, expect, it } from 'vitest';

import '../../../src/editor/monaco/monaco-setup.js';

// The grammar as the window wires it: the language the setup registers it under.
const LANGUAGE = 'jsonc';

/** Each piece of the first line with the token it was read as, suffix dropped. */
function tokensOf(text: string): string[][] {
    const line = editor.tokenize(text, LANGUAGE)[0] ?? [];

    return line.map((token, index) => [
        text.slice(token.offset, line[index + 1]?.offset),
        token.type.replace(/\.json$/, ''),
    ]);
}

describe('reading JSON with comments', () => {
    it('tells a key from the string it holds', () => {
        expect(tokensOf('{"a": "b"}')).toEqual([
            ['{', 'delimiter.bracket'],
            ['"a"', 'string.key'],
            [':', 'delimiter.colon'],
            [' ', 'white'],
            ['"b"', 'string.value'],
            ['}', 'delimiter.bracket'],
        ]);
    });

    it('reads numbers, literals and the punctuation of an array', () => {
        expect(tokensOf('[-1.5e3,true,null]')).toEqual([
            ['[', 'delimiter.array'],
            ['-1.5e3', 'number'],
            [',', 'delimiter.comma'],
            ['true', 'keyword'],
            [',', 'delimiter.comma'],
            ['null', 'keyword'],
            [']', 'delimiter.array'],
        ]);
    });

    it('reads both kinds of comment', () => {
        expect(tokensOf('1 /* b */ // l')).toEqual([
            ['1', 'number'],
            [' ', 'white'],
            ['/* b */', 'comment'],
            [' ', 'white'],
            ['// l', 'comment'],
        ]);
    });

    it('carries a comment left open on to the next line', () => {
        const lines = editor.tokenize('/* a\nb */ 1', LANGUAGE);

        expect(lines[1]?.map((token) => token.type)).toEqual([
            'comment.json',
            'white.json',
            'number.json',
        ]);
    });

    /**
     * A template stands where a value goes and is filled in before the payload is sent. No theme
     * colours its token: it reads in the colour of the text around it.
     */
    it('reads a bare template as one token no theme colours, and not as two objects', () => {
        expect(tokensOf('{"n": {{count}}}')).toEqual([
            ['{', 'delimiter.bracket'],
            ['"n"', 'string.key'],
            [':', 'delimiter.colon'],
            [' ', 'white'],
            ['{{count}}', 'template'],
            ['}', 'delimiter.bracket'],
        ]);
    });

    it('marks what no JSON can hold', () => {
        expect(tokensOf('{a}')).toEqual([
            ['{', 'delimiter.bracket'],
            ['a', 'invalid'],
            ['}', 'delimiter.bracket'],
        ]);
    });
});
