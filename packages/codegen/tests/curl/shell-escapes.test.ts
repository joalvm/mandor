import { describe, expect, it } from 'vitest';

import { withoutShellEscapes } from '../../src/curl/shell-escapes.js';

describe('the escapes of a value that is not a body', () => {
    it.each([
        ['a=1\\&b\\=2', 'a=1&b=2'],
        ['f\\[id\\]', 'f[id]'],
        ['application\\/json', 'application/json'],
        ['a\\;b\\$c\\!d', 'a;b$c!d'],
        ['a\\\nb', 'ab'],
        ['a\\  \r\n  b', 'ab'],
    ])('reads %j as %j', (text, plain) => {
        expect(withoutShellEscapes(text)).toBe(plain);
    });

    it.each(['C:\\temp', 'a\\"b', 'a\\\\b', '\\{{t}}', 'plain', 'a\nb'])('leaves %j', (text) => {
        expect(withoutShellEscapes(text)).toBe(text);
    });
});
