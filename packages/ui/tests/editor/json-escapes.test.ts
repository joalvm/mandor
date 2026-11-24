import { describe, expect, it } from 'vitest';

import { withEscapesShown } from '../../src/editor/json-escapes.js';

describe('a JSON text read with its escapes shown', () => {
    it('writes a letter escaped as \\u as the letter itself', () => {
        expect(withEscapesShown('{"message": "Correo electr\\u00f3nico inv\\u00e1lido"}')).toBe(
            '{"message": "Correo electrónico inválido"}',
        );
    });

    it('joins a character written as two escapes', () => {
        expect(withEscapesShown('"\\ud83d\\ude00"')).toBe('"😀"');
    });

    /** `\/` and the rest are the server's own writing, and say nothing a reader misses. */
    it('leaves every other escape as it came', () => {
        const text = '"a\\/b\\n\\t\\"q\\" \\\\u00f3"';

        expect(withEscapesShown(text)).toBe(text);
    });

    /** A string cannot hold these bare: shown, the text would no longer parse to the same value. */
    it('keeps escaped what a string cannot hold bare', () => {
        const text = '"\\u0022 \\u005c \\u0000 \\u200b \\u2028 \\ud800"';

        expect(withEscapesShown(text)).toBe(text);
        expect(JSON.parse(withEscapesShown('"\\u00f3\\u0022"'))).toBe('ó"');
    });
});
