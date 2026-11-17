import { describe, expect, it } from 'vitest';

import { expandAnsiCQuotes } from '../../src/curl/ansi-c-quotes.js';

describe('the $-quoted strings of bash', () => {
    it.each([
        ['an escaped single quote', '$\'{"a":"b\\\'c"}\'', "'{\"a\":\"b'\\''c\"}'"],
        ['a line break', "$'a\\nb'", "'a\nb'"],
        ['a tab and a carriage return', "$'a\\tb\\rc'", "'a\tb\rc'"],
        ['the other single-letter escapes', "$'\\a\\b\\e\\E\\f\\v'", "'\x07\b\x1b\x1b\f\v'"],
        ['a backslash and a double quote', "$'\\\\ \\\"'", "'\\ \"'"],
        ['a question mark', "$'\\?'", "'?'"],
        ['a hexadecimal byte', "$'\\x41\\x4a'", "'AJ'"],
        ['a four-digit unicode escape', "$'\\u00e9\\u4e2d'", "'é中'"],
        ['an eight-digit unicode escape', "$'\\U0001F600'", "'😀'"],
        ['an octal escape', "$'\\101\\60'", "'A0'"],
        ['an escape bash does not know', "$'\\q'", "'\\q'"],
        ['a hexadecimal escape with no digit', "$'\\xZ'", "'\\xZ'"],
        ['a code point past the end of unicode', "$'\\UFFFFFFFF'", "'\\UFFFFFFFF'"],
    ])('decodes %s', (_name, text, expected) => {
        expect(expandAnsiCQuotes(text)).toBe(expected);
    });

    it('leaves the text alone when it has no such string', () => {
        expect(expandAnsiCQuotes('curl \'https://h\' -H "A: b"')).toBe(
            'curl \'https://h\' -H "A: b"',
        );
    });

    it('does not touch a $ followed by a quote inside other quotes', () => {
        expect(expandAnsiCQuotes('say "$\'x\' now"')).toBe('say "$\'x\' now"');
        expect(expandAnsiCQuotes("cost '$' x")).toBe("cost '$' x");
    });

    it('does not open a string after an escaped quote', () => {
        expect(expandAnsiCQuotes("a\\'b $'x'")).toBe("a\\'b 'x'");
        expect(expandAnsiCQuotes('"a\\"b $\'x\'"')).toBe('"a\\"b $\'x\'"');
    });

    it('leaves a string with no end as it is', () => {
        expect(expandAnsiCQuotes("curl $'abc")).toBe("curl $'abc");
        expect(expandAnsiCQuotes("curl $'abc\\")).toBe("curl $'abc\\");
    });

    it('decodes several strings in one text', () => {
        expect(expandAnsiCQuotes("-H $'A: \\x31' -d $'b\\n'")).toBe("-H 'A: 1' -d 'b\n'");
    });
});
