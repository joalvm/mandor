import { describe, expect, it } from 'vitest';

import { describeSide } from '../../src/lib/describe-side.js';

describe('how a side of a clash reads (describe-side)', () => {
    it('says what the caller says when the side is not there', () => {
        expect(describeSide(null, 'Sin valor')).toEqual({ block: false, text: 'Sin valor' });
    });

    it('reads a short string as it is, inline', () => {
        expect(describeSide({ value: 'GET' }, '-')).toEqual({ block: false, text: 'GET' });
    });

    it('asks a block for a string with several lines or a long one', () => {
        expect(describeSide({ value: 'a\nb' }, '-').block).toBe(true);
        expect(describeSide({ value: 'x'.repeat(81) }, '-').block).toBe(true);
    });

    it('reads a line of a list as key and value', () => {
        expect(describeSide({ value: { key: 'Accept', value: 'text/html' } }, '-')).toEqual({
            block: false,
            text: 'Accept: text/html',
        });
    });

    it('lays out any other object as JSON, in a block', () => {
        expect(describeSide({ value: { retries: 3 } }, '-')).toEqual({
            block: true,
            text: '{\n  "retries": 3\n}',
        });
    });

    it('does not take an object with a key and a value that are no strings for a line', () => {
        expect(describeSide({ value: { key: 'a', value: 1 } }, '-').block).toBe(true);
    });

    it('reads numbers, booleans and nulls as their words', () => {
        expect(describeSide({ value: 3 }, '-').text).toBe('3');
        expect(describeSide({ value: false }, '-').text).toBe('false');
        expect(describeSide({ value: null }, '-').text).toBe('null');
    });
});
