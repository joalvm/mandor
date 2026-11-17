import type { InteropParameter } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { requestRowsOf } from '../../../src/openapi/import/request-rows.js';

function parameter(
    place: InteropParameter['in'],
    name: string,
    extra: Partial<InteropParameter> = {},
) {
    return { name, in: place, required: false, value: '', ...extra } satisfies InteropParameter;
}

describe('the rows the parameters of an operation become', () => {
    it('sorts them into query, headers and path rows, each switched on when the document requires it', () => {
        const rows = requestRowsOf([
            parameter('query', 'limit', { value: '10', schema: '{"type":"integer"}' }),
            parameter('query', 'sort', { required: true, value: 'asc' }),
            parameter('header', 'X-Trace', { value: 'on' }),
            parameter('path', 'petId', {
                required: true,
                value: '7',
                schema: '{"type":"integer"}',
            }),
        ]);

        expect(rows).toEqual({
            query: [
                {
                    key: 'limit',
                    value: '10',
                    enabled: false,
                    required: false,
                    schema: '{"type":"integer"}',
                },
                { key: 'sort', value: 'asc', enabled: true, required: true },
            ],
            headers: [{ key: 'X-Trace', value: 'on', enabled: false, required: false }],
            pathParams: [
                {
                    key: 'petId',
                    value: '7',
                    enabled: true,
                    required: true,
                    schema: '{"type":"integer"}',
                },
            ],
        });
    });

    it('turns the cookies into the one Cookie header, a conversion and not a loss', () => {
        const rows = requestRowsOf([
            parameter('header', 'X-A', { value: '1' }),
            parameter('cookie', 'a', { value: '1', required: true }),
            parameter('cookie', 'b', { value: '2' }),
        ]);

        expect(rows.headers).toEqual([
            { key: 'X-A', value: '1', enabled: false, required: false },
            { key: 'Cookie', value: 'a=1; b=2', enabled: true },
        ]);
    });

    it('has no rows for an operation with no parameters', () => {
        expect(requestRowsOf([])).toEqual({ query: [], headers: [], pathParams: [] });
    });

    it('leaves a Cookie header off when no cookie is required', () => {
        expect(requestRowsOf([parameter('cookie', 'a', { value: '1' })]).headers).toEqual([
            { key: 'Cookie', value: 'a=1', enabled: false },
        ]);
    });
});
