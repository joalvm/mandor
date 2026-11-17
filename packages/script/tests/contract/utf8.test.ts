import { describe, expect, it } from 'vitest';

import { byteLength, truncateUtf8 } from '../../src/contract/utf8.js';

describe('byteLength', () => {
    it('counts UTF-8 bytes, not characters', () => {
        expect(byteLength('abc')).toBe(3);
        expect(byteLength('é')).toBe(2);
        expect(byteLength('€')).toBe(3);
        expect(byteLength('😀')).toBe(4);
        expect(byteLength('')).toBe(0);
    });
});

describe('truncateUtf8', () => {
    it('leaves a text that fits, even when it fits to the byte', () => {
        expect(truncateUtf8('éé', 4)).toBe('éé');
        expect(truncateUtf8('abc', 10)).toBe('abc');
    });

    it('cuts at a byte count and never inside a character', () => {
        expect(truncateUtf8('aéb', 2)).toBe('a');
        expect(truncateUtf8('a€', 3)).toBe('a');
        expect(truncateUtf8('a😀', 4)).toBe('a');
        expect(truncateUtf8('a😀', 5)).toBe('a😀');
    });

    it('gives an empty text for a limit of nothing', () => {
        expect(truncateUtf8('abc', 0)).toBe('');
        expect(truncateUtf8('😀', 3)).toBe('');
    });

    it('gives an empty text for a limit under nothing, not the text cut from its end', () => {
        expect(truncateUtf8('abc', -1)).toBe('');
    });

    it('keeps the result under the limit for multibyte text right at the edge', () => {
        const text = 'é'.repeat(2049);
        const cut = truncateUtf8(text, 4096);

        expect(byteLength(cut)).toBe(4096);
        expect(cut).not.toContain('�');
    });
});
