import { describe, expect, it } from 'vitest';

import { withPlainPunctuation } from '../../src/curl/plain-punctuation.js';

describe('the punctuation of a command that went through a page', () => {
    it.each([
        ['curly double quotes', 'curl \u201ca b\u201d', 'curl "a b"'],
        ['low double quotes', 'curl \u201ea b\u201d', 'curl "a b"'],
        ['a straight quote inside curly ones', 'curl \u201ca"b\u201d', 'curl "a\\"b"'],
        ['curly single quotes', 'curl \u2018a b\u2019', "curl 'a b'"],
        ['a straight apostrophe inside curly ones', "curl \u2018a'b\u2019", "curl 'a'\\''b'"],
        ['a no-break space', 'curl\u00a0x', 'curl x'],
        ['a narrow space', 'curl\u202fx', 'curl x'],
        ['an invisible space', 'cu\u200brl x\ufeff', 'curl x'],
        ['two dashes', '\u2013\u2013location', '--location'],
        ['a long dash', '\u2014location', '--location'],
        ['a dash before a long name', '\u2013location', '--location'],
        ['a dash before a letter', '\u2013H x', '-H x'],
        ['a dash before a letter and its value', '\u2013XPOST', '-XPOST'],
        ['a minus sign', '\u2212\u2212data', '--data'],
    ])('reads %s', (_name, text, plain) => {
        expect(withPlainPunctuation(text)).toBe(plain);
    });

    it.each([
        ['a string between straight single quotes', "'l\u2019eau \u2013 \u201cok\u201d\u00a0'"],
        ['a string between straight double quotes', '"l\u2019eau \u2013 \u201cok\u201d\u00a0"'],
        ['an escaped quote inside double quotes', '"a\\" \u2013 \u201cok\u201d"'],
        ['an escape outside quotes', '\\\u201ca'],
        ['an apostrophe in a word', 'l\u2019eau'],
        ['a dash inside a word', 'a\u2013b'],
        ['a dash on its own', 'a \u2013 b'],
    ])('leaves %s', (_name, text) => {
        expect(withPlainPunctuation(text)).toBe(text);
    });
});
