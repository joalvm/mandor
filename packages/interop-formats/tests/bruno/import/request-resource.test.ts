import { degradation, importResourceSchema } from '@mandor/interop-core';
import { requestItemSchema } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { requestResourceOf } from '../../../src/bruno/import/request-resource.js';
import { bodyNode, requestNode, rowOf } from '../support/trees.js';

const SOURCE = 'collection:c';
const ROUTE = 'tienda/lista';

function resourceOf(overrides: Parameters<typeof requestNode>[0] = {}) {
    return requestResourceOf(requestNode(overrides), SOURCE, ROUTE);
}

describe('requestResourceOf', () => {
    it('is an item of the workspace under its route, with the origin of the document', () => {
        const resource = resourceOf();

        expect(resource).toMatchObject({
            place: 'item',
            itemKind: 'request',
            route: ROUTE,
            name: 'Lista',
            origin: { kind: 'bruno', sourceId: SOURCE },
            degradations: [],
        });
        expect(resource.origin.fingerprint).toMatch(/\S/u);
        expect(importResourceSchema.safeParse(resource).success).toBe(true);
    });

    it('writes a request the schema of Mandor reads, with every part of the Bruno one', () => {
        const resource = resourceOf({
            method: 'POST',
            url: 'https://api.test/:species/pets?page=2',
            description: 'Alta',
            headers: [rowOf('Accept', 'application/json'), rowOf('X-Off', '1', { disabled: true })],
            params: [rowOf('limit', '10')],
            pathParams: [rowOf('species', 'dog')],
            body: bodyNode('json', { text: '{}' }),
            auth: { type: 'bearer', token: '{{token}}' },
        });

        expect(
            requestItemSchema.safeParse({ ...resource.fields, name: resource.name }).success,
        ).toBe(true);
        expect(resource.fields).toMatchObject({
            method: 'POST',
            url: 'https://api.test/{species}/pets',
            description: 'Alta',
            headers: [
                { key: 'Accept', value: 'application/json', enabled: true },
                { key: 'X-Off', value: '1', enabled: false },
            ],
            query: [
                { key: 'limit', value: '10', enabled: true },
                { key: 'page', value: '2', enabled: true },
            ],
            pathParams: [{ key: 'species', value: 'dog', enabled: true }],
            body: { type: 'json', content: '{}' },
            auth: { type: 'bearer', token: '{{token}}' },
        });
    });

    it('says what it could not hold, each sentence once, auth and body first', () => {
        const resource = resourceOf({
            body: bodyNode('sparql', { text: 'ASK {}' }),
            auth: { type: 'digest' },
            leftOut: ['scripts', 'tags'],
        });

        expect(resource.degradations).toEqual([
            degradation('authNoEquivalentRequest', { type: 'digest' }),
            degradation('bodySparqlAsText'),
            degradation('noPlaceRequest', { names: 'scripts, tags' }),
        ]);
        expect(resource.fields['auth']).toEqual({ type: 'none' });
    });

    it('leaves out what the request did not say', () => {
        const { fields } = resourceOf();

        expect(fields).not.toHaveProperty('description');
        expect(fields).not.toHaveProperty('auth');
        expect(fields).not.toHaveProperty('headers');
    });

    it('has the same fingerprint for the same request and another for a changed one', () => {
        const first = resourceOf({ url: 'https://a.test' }).origin.fingerprint;

        expect(resourceOf({ url: 'https://a.test' }).origin.fingerprint).toBe(first);
        expect(resourceOf({ url: 'https://b.test' }).origin.fingerprint).not.toBe(first);
    });

    it('keeps the tags of the request, and writes no key when it has none', () => {
        expect(resourceOf({ tags: ['smoke', ' '] }).fields).toMatchObject({ tags: ['smoke'] });
        expect(resourceOf().fields).not.toHaveProperty('tags');
    });
});
