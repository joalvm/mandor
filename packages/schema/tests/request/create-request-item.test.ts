import { describe, expect, it } from 'vitest';

import { createRequestItem } from '../../src/request/create-request-item.js';

describe('createRequestItem', () => {
    it('makes a request with nothing but a name: plain GET, no body, settings of the app', () => {
        expect(createRequestItem({ name: 'crear pedido' })).toEqual({
            name: 'crear pedido',
            method: 'GET',
            url: '',
            query: [],
            headers: [],
            pathParams: [],
            body: { type: 'none' },
            examples: [],
            settings: {},
        });
    });
});
