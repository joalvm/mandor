import { createRequestItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { withPathRows } from '../../../../src/renderer/features/requests/lib/with-path-rows.js';

const REQUEST = {
    ...createRequestItem({ name: 'pet' }),
    pathParams: [{ enabled: true, key: 'petId', required: true, value: '7' }],
};

describe('the path rows a url asks for', () => {
    it('gives a name the path says and no row has an empty row of its own', () => {
        expect(withPathRows(REQUEST, { url: '/{owner}/pets/{petId}' })).toEqual({
            pathParams: [
                { enabled: true, key: 'petId', required: true, value: '7' },
                { enabled: true, key: 'owner', value: '' },
            ],
            url: '/{owner}/pets/{petId}',
        });
    });

    it('leaves the changes alone when the url names nothing new, or is not what changed', () => {
        expect(withPathRows(REQUEST, { url: '/pets/{petId}' })).toEqual({ url: '/pets/{petId}' });
        expect(withPathRows(REQUEST, { method: 'POST' })).toEqual({ method: 'POST' });
    });

    it('counts the rows that change brings along, not the ones the request had', () => {
        expect(withPathRows(REQUEST, { pathParams: [], url: '/pets/{petId}' })).toEqual({
            pathParams: [{ enabled: true, key: 'petId', value: '' }],
            url: '/pets/{petId}',
        });
    });
});
