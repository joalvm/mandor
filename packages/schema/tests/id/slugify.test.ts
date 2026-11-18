import { describe, expect, it } from 'vitest';

import { IdError, slugify } from '../../src/index.js';

describe('slugify', () => {
    it("derives 'api-pagos' from 'Api Pagos'", () => {
        expect(slugify('Api Pagos')).toBe('api-pagos');
    });

    it('strips diacritics and collapses separators', () => {
        expect(slugify('  Configuración — v2  ')).toBe('configuracion-v2');
    });

    /** A name in any alphabet is a name: only Latin letters fold into their plain form. */
    it('keeps the letters of every alphabet, lower case', () => {
        expect(slugify('日本 API')).toBe('日本-api');
        expect(slugify('Привет, Мир')).toBe('привет-мир');
        expect(slugify('Ὀδυσσεύς')).toBe('ὀδυσσεύς');
    });

    it('keeps the marks a script cannot be read without, composed', () => {
        expect(slugify('がっこう')).toBe('がっこう');
        expect(slugify('नमस्ते दुनिया')).toBe('नमस्ते-दुनिया');
        expect(slugify('\u304b\u3099')).toBe('\u304c');
    });

    it('folds what only looks unlike a Latin letter or digit into it', () => {
        expect(slugify('Ｐｅｄｉｄｏ ①')).toBe('pedido-1');
        expect(slugify('İstanbul')).toBe('istanbul');
    });

    it('throws when the name has no usable characters', () => {
        expect(() => {
            slugify('!!!');
        }).toThrow(IdError);
    });

    it('appends a numeric suffix when the base id is taken', () => {
        expect(slugify('Api Pagos', ['api-pagos'])).toBe('api-pagos-2');
    });

    it('keeps incrementing until the id is free', () => {
        expect(slugify('Api Pagos', ['api-pagos', 'api-pagos-2'])).toBe('api-pagos-3');
    });

    it('suffixes a Windows device name into a portable id', () => {
        expect(slugify('CON')).toBe('con-2');
    });

    it('keeps a suffixed id within the portable file-name limit', () => {
        const name = 'a'.repeat(256);
        const base = 'a'.repeat(255);

        expect(slugify(name, [base])).toBe(`${'a'.repeat(253)}-2`);
    });

    /** Linux counts a file name in bytes, and a letter beyond ASCII takes two to four of them. */
    it('keeps an id of wide letters within the bytes of a portable file name', () => {
        const base = '日'.repeat(85);

        expect(slugify('日'.repeat(100))).toBe(base);
        expect(slugify('日'.repeat(100), [base])).toBe(`${'日'.repeat(84)}-2`);
    });
});
