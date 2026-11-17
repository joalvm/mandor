import type { RequestItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { requestPartOf } from '../../../src/bruno/export/request-part.js';

const REQUEST: RequestItem = {
    name: 'Pide',
    method: 'POST',
    url: 'https://x/{id}',
    query: [{ key: 'q', value: '1', enabled: true }],
    headers: [{ key: 'a', value: 'b', enabled: true }],
    pathParams: [
        { key: 'id', value: '7', enabled: true },
        { key: '', value: 'x', enabled: true },
    ],
    body: { type: 'none' },
    examples: [],
    settings: {},
};

describe('what a request writes of where it goes', () => {
    it('writes the url with its query, the headers and both kinds of parameter', () => {
        expect(requestPartOf(REQUEST)).toEqual({
            method: 'POST',
            url: 'https://x/:id?q=1',
            headers: [{ name: 'a', value: 'b' }],
            params: [
                { name: 'q', value: '1', type: 'query' },
                { name: 'id', value: '7', type: 'path' },
            ],
        });
    });

    it('writes no list for a request with no rows', () => {
        expect(
            requestPartOf({ ...REQUEST, url: 'https://x', query: [], headers: [], pathParams: [] }),
        ).toEqual({
            method: 'POST',
            url: 'https://x',
        });
    });
});
