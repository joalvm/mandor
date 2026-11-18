import { describe, expect, it } from 'vitest';

import { METHOD_PATTERN, STANDARD_METHODS } from '../../src/request/request-methods.js';

describe('the methods of a request', () => {
    it('offers the standard seven, in the order a picker shows them', () => {
        expect(STANDARD_METHODS).toEqual([
            'GET',
            'POST',
            'PUT',
            'PATCH',
            'DELETE',
            'HEAD',
            'OPTIONS',
        ]);
    });

    it.each([
        ['GET', true],
        ['CLEAN', true],
        ['X-TRACE-2', true],
        ['post', false],
        ['2GET', false],
        ['GET POST', false],
    ])('METHOD_PATTERN keeps %j when %j', (method, kept) => {
        expect(METHOD_PATTERN.test(method)).toBe(kept);
    });
});
