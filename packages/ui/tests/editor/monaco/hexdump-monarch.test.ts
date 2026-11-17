import { editor } from 'monaco-editor/editor/editor.api.js';
import { describe, expect, it } from 'vitest';

import '../../../src/editor/monaco/monaco-setup.js';

// The grammar as the window wires it: the language the setup registers it under.
const LANGUAGE = 'binary';

function tokensOf(text: string): string[][] {
    const line = editor.tokenize(text, LANGUAGE)[0] ?? [];

    return line.map((token, index) => [
        text.slice(token.offset, line[index + 1]?.offset),
        token.type.replace(/\.hexdump$/, ''),
    ]);
}

describe('reading a hex dump', () => {
    it('tells the offset, the bytes and the text they spell apart', () => {
        expect(tokensOf('00000010: 7B 22  {"')).toEqual([
            ['00000010:', 'comment'],
            [' ', 'white'],
            ['7B', 'number'],
            [' ', 'white'],
            ['22', 'number'],
            ['  ', 'white'],
            ['{"', 'string'],
        ]);
    });

    /** The text column spells whatever the bytes spell, hex digits and spaces included. */
    it('reads the text column as text, whatever it spells', () => {
        expect(tokensOf('00000000: 41 20 42  A B').at(-1)).toEqual(['A B', 'string']);
        expect(tokensOf('00000000: 41 42  AB').at(-1)).toEqual(['AB', 'string']);
    });
});
