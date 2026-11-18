import { exampleResource, itemResource } from '@mandor/collections';
import type { RequestItem } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { beforeEach, describe, expect, it } from 'vitest';

import { openExampleAsRequest } from '../../../../src/renderer/features/requests/lib/open-example-as-request.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';

const ITEM = itemResource('Local', 'local', 'crear-pedido');
const CREATED = exampleResource('Local', 'local', 'crear-pedido', 'Creado');

const REQUEST: RequestItem = {
    body: { type: 'none' },
    examples: [
        {
            body: '{}',
            contentType: 'application/json',
            name: 'Creado',
            request: { query: [{ enabled: true, key: 'dry', value: '1' }] },
            status: '201',
        },
    ],
    headers: [],
    method: 'POST',
    name: 'crear pedido',
    pathParams: [],
    query: [],
    settings: { followRedirects: true, maxRedirects: 5, timeoutMs: 30000, validateTls: true },
    url: '/pedidos',
};

function looseRequests(): RequestItem[] {
    return Object.entries(requestsStore.getState().requests)
        .filter(([resource]) => resource.includes('/loose/'))
        .map(([, request]) => request);
}

describe('opening an example as a request', () => {
    beforeEach(() => {
        requestsStore.getState().reset();
        shellStore.getState().reset();
        shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
        shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
    });

    it('opens a request of its own with what the example changes laid over its parent', () => {
        requestsStore.getState().beginRead(ITEM);
        requestsStore.getState().finishRead(ITEM, REQUEST);

        openExampleAsRequest(CREATED);

        const [opened] = looseRequests();

        expect(looseRequests()).toHaveLength(1);
        expect(opened).toMatchObject({
            examples: [],
            method: 'POST',
            query: [{ enabled: true, key: 'dry', value: '1' }],
            url: '/pedidos',
        });
        expect(opened?.name).toBe('crear pedido — Creado');
    });

    it('opens nothing for an example whose request was not read', () => {
        openExampleAsRequest(CREATED);

        expect(looseRequests()).toEqual([]);
    });

    it('opens nothing for an example the request lost', () => {
        requestsStore.getState().beginRead(ITEM);
        requestsStore.getState().finishRead(ITEM, { ...REQUEST, examples: [] });

        openExampleAsRequest(CREATED);

        expect(looseRequests()).toEqual([]);
    });
});
