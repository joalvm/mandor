import {
    degradation,
    fingerprintOf,
    type ImportResource,
    type InteropDocument,
    type InteropOperation,
} from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { documentToInterop } from '../../../src/openapi/import/document-to-interop.js';
import { importResourcesOf } from '../../../src/openapi/import/import-resources.js';
import { fixtureText } from '../support/fixture-text.js';

async function resourcesOfSample(): Promise<ImportResource[]> {
    return importResourcesOf(await documentToInterop(fixtureText('sample-3.1.yaml')), 'workspace');
}

function byRoute(resources: ImportResource[], place: string, route: string) {
    return resources.find((resource) => resource.place === place && resource.route === route);
}

function operation(name: string, tags: string[], security: string[] | null = null) {
    return {
        name,
        channel: '/x',
        direction: 'outgoing',
        security: [],
        http: { method: 'GET', path: '/x', tags, parameters: [], responses: [], security },
        extras: {},
    } satisfies InteropOperation;
}

function documentWith(operations: InteropOperation[]): InteropDocument {
    return {
        name: 'Doc',
        sourceId: 'abc',
        servers: [],
        security: {},
        channels: [],
        operations,
        defaultSecurity: [],
        payloadSchemas: {},
        notes: [],
        extras: {},
    };
}

describe('an OpenAPI document as the resources of a workspace', () => {
    it('lists the workspace auth, the environments, the folders and the requests, in that order', async () => {
        const resources = await resourcesOfSample();

        expect(resources.map((resource) => `${resource.place}:${resource.route}`)).toEqual([
            'workspace:.',
            'environment:shop',
            'environment:relative',
            'collection:sample-shop',
            'folder:sample-shop/orders',
            'folder:sample-shop/files',
            'item:sample-shop/orders/list-orders',
            'item:sample-shop/orders/createorder',
            'item:sample-shop/orders/get-an-order',
            'item:sample-shop/files/upload-a-file',
        ]);
        expect(new Set(resources.map((resource) => resource.origin.sourceId)).size).toBe(1);
    });

    it('files a request with no tag at the top of the collection, not inside a folder', () => {
        const resources = importResourcesOf(
            documentWith([operation('list-orders', [])]),
            'workspace',
        );
        const item = resources.find((resource) => resource.place === 'item');

        expect(item?.route).toBe('doc/list-orders');
    });

    it('writes a request whole: url, rows, body, schema, examples and what it says of itself', async () => {
        const resources = await resourcesOfSample();
        const list = byRoute(resources, 'item', 'sample-shop/orders/list-orders');
        const create = byRoute(resources, 'item', 'sample-shop/orders/createorder');

        expect(list).toMatchObject({ itemKind: 'request', name: 'List orders', degradations: [] });
        expect(list?.fields).toMatchObject({
            method: 'GET',
            url: '{{baseUrl}}/orders',
            query: [
                { key: 'status', value: 'open', enabled: true, required: true },
                { key: 'page', value: '2', enabled: false, required: false },
            ],
            headers: [{ key: 'Cookie', value: 'session=abc', enabled: false }],
            examples: [{ name: 'one', status: '200', contentType: 'application/json' }],
        });
        expect(list?.fields['auth']).toBeUndefined();
        expect(create?.fields).toMatchObject({
            method: 'POST',
            body: { type: 'json' },
            bodySchema: expect.stringContaining('oneOf') as unknown,
            operationId: 'createOrder',
            deprecated: true,
        });
    });

    it('gives the path rows their own list, and the request its auth when it is not the workspace', async () => {
        const resources = await resourcesOfSample();
        const get = byRoute(resources, 'item', 'sample-shop/orders/get-an-order');
        const upload = byRoute(resources, 'item', 'sample-shop/files/upload-a-file');

        expect(get?.fields).toMatchObject({
            url: '{{baseUrl}}/orders/{orderId}',
            pathParams: [{ key: 'orderId', enabled: true, required: true }],
            auth: { type: 'none' },
        });
        expect(upload?.fields['auth']).toMatchObject({ type: 'apikey', in: 'header' });
        expect(upload?.fields['body']).toBeUndefined();
        expect(upload?.degradations).toEqual([
            degradation('bodyTypeEmpty', { type: 'application/octet-stream' }),
        ]);
    });

    it('fingerprints what it wrote, name and fields, the way the workspace is read back', async () => {
        const resources = await resourcesOfSample();
        const list = byRoute(resources, 'item', 'sample-shop/orders/list-orders');

        expect(list?.origin).toEqual({
            kind: 'openapi',
            sourceId: expect.stringMatching(/^[0-9a-f]{64}$/u) as unknown,
            fingerprint: fingerprintOf({ name: 'List orders', ...list?.fields }),
        });
        expect(
            byRoute(resources, 'folder', 'sample-shop/orders')?.origin.fingerprint,
        ).toBeUndefined();
    });

    it('files an untagged request at the top, away from the folders and the names taken', () => {
        const resources = importResourcesOf(
            documentWith([
                operation('Pets', ['pets']),
                operation('Pets', []),
                operation('Pets', ['  ', 'pets']),
                operation('Pets', ['pets']),
            ]),
            'workspace',
        );

        expect(resources.map((resource) => `${resource.place}:${resource.route}`)).toEqual([
            'environment:default',
            'collection:doc',
            'folder:doc/pets',
            'item:doc/pets/pets',
            'item:doc/pets-2',
            'item:doc/pets/pets-2',
            'item:doc/pets/pets-3',
        ]);
    });

    it('leaves out an operation that is no request, and the workspace when no auth is held', () => {
        const message = { ...operation('Event', []), http: undefined };
        const resources = importResourcesOf(
            documentWith([message, operation('A', [], ['gone'])]),
            'workspace',
        );

        expect(resources.map((resource) => resource.place)).toEqual([
            'environment',
            'collection',
            'item',
        ]);
        expect(resources[2]?.degradations).toEqual([
            degradation('securityNotDeclared', { name: 'gone' }),
        ]);
    });
});
