import { describe, expect, it } from 'vitest';

import { requestLinesOf } from '../../../src/postman/import/request-lines-of.js';

describe('requestLinesOf', () => {
    it('puts each parameter in its table; with no word on it, what is required is on', () => {
        const lines = requestLinesOf([
            { name: 'q', in: 'query', required: true, value: '1' },
            { name: 'H', in: 'header', required: true, enabled: false, value: '2' },
            { name: 'id', in: 'path', required: false, value: '3' },
            { name: 'c', in: 'cookie', required: true, value: '4' },
        ]);

        expect(lines).toEqual({
            query: [{ key: 'q', value: '1', enabled: true }],
            headers: [{ key: 'H', value: '2', enabled: false }],
            pathParams: [{ key: 'id', value: '3', enabled: false }],
        });
    });
});
