import { describe, expect, it } from 'vitest';

import { QUOTE_OF_SHELL } from '../../src/snippet/curl-quote.js';

describe('a word quoted for a shell (curl-quote)', () => {
    it('leaves bash single quotes for a plain word and a control character in its code', () => {
        expect(QUOTE_OF_SHELL.bash('a b $HOME')).toBe("'a b $HOME'");
        expect(QUOTE_OF_SHELL.bash('a\tb\\')).toBe(String.raw`$'a\u0009b\\'`);
        expect(QUOTE_OF_SHELL.bash('\r')).toBe(String.raw`$'\r'`);
    });

    it('puts every character cmd could act on behind a caret, and nothing else', () => {
        expect(QUOTE_OF_SHELL.cmd('a-b_c:1/2.3?x=y')).toBe('^"a-b_c:1/2.3?x=y^"');
        expect(QUOTE_OF_SHELL.cmd('a|b<c>d^e')).toBe('^"a^|b^<c^>d^^e^"');
        expect(QUOTE_OF_SHELL.cmd('C:\\x')).toBe(String.raw`^"C:^\^\x^"`);
    });
});
