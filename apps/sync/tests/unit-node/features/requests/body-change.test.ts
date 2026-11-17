import type { RequestItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { changesOfBody } from '../../../../src/renderer/features/requests/lib/body-change.js';

const REQUEST: RequestItem = {
    body: { type: 'none' },
    examples: [],
    headers: [],
    method: 'GET',
    name: 'crear pedido',
    pathParams: [],
    query: [],
    settings: { followRedirects: true, maxRedirects: 5, timeoutMs: 30000, validateTls: true },
    url: '',
};

describe('what editing the body changes in the request', () => {
    it('a graphql operation picked on a GET takes the POST along', () => {
        expect(changesOfBody(REQUEST, { type: 'graphql', query: 'q', variables: '{}' })).toEqual({
            body: { type: 'graphql', query: 'q', variables: '{}' },
            method: 'POST',
        });
    });

    it('any other kind is the body alone, and a graphql already on a POST stays', () => {
        expect(changesOfBody(REQUEST, { type: 'json', content: '{}' })).toEqual({
            body: { type: 'json', content: '{}' },
        });

        const posted: RequestItem = {
            ...REQUEST,
            body: { type: 'graphql', query: 'q', variables: '{}' },
        };

        expect(changesOfBody(posted, { type: 'graphql', query: 'next', variables: '{}' })).toEqual({
            body: { type: 'graphql', query: 'next', variables: '{}' },
        });
    });
});
