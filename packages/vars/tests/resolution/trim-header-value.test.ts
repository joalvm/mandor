import { describe, expect, it } from 'vitest';

import { trimHeaderValue } from '../../src/index.js';

describe('trimHeaderValue', () => {
    it('drops the whitespace a browser drops around a header value', () => {
        expect(trimHeaderValue('Mozilla/5.0 Edg/158.0.0.0\r\n')).toBe('Mozilla/5.0 Edg/158.0.0.0');
        expect(trimHeaderValue('\t  es \n')).toBe('es');
    });

    it('keeps what sits between the ends, a break included', () => {
        expect(trimHeaderValue('a  b')).toBe('a  b');
        expect(trimHeaderValue('a\r\nb')).toBe('a\r\nb');
    });

    it('trims only http whitespace, never other blanks', () => {
        const nbsp = String.fromCodePoint(0xa0);

        expect(trimHeaderValue(`${nbsp}x${nbsp}`)).toBe(`${nbsp}x${nbsp}`);
    });

    it('leaves a value with nothing around it as it came', () => {
        expect(trimHeaderValue('token')).toBe('token');
        expect(trimHeaderValue('')).toBe('');
    });
});
