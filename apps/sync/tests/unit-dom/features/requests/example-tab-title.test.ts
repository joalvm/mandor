import { exampleResource, itemResource } from '@mandor/collections';
import type { RequestItem } from '@mandor/schema';
import { beforeEach, describe, expect, it } from 'vitest';

import { exampleTabTitle } from '../../../../src/renderer/features/requests/lib/example-tab-title.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';

const ITEM = itemResource('Local', 'local', 'crear-pedido');
const CREATED = exampleResource('Local', 'local', 'crear-pedido', 'Creado');

const REQUEST: RequestItem = {
    body: { type: 'none' },
    examples: [{ body: '', contentType: '', name: 'Creado', status: '201' }],
    headers: [],
    method: 'GET',
    name: 'crear pedido',
    pathParams: [],
    query: [],
    settings: { followRedirects: true, maxRedirects: 5, timeoutMs: 30000, validateTls: true },
    url: '',
};

describe('the title of the tab of an example', () => {
    beforeEach(() => {
        requestsStore.getState().reset();
    });

    it('is empty while the request has not been read, and never its key', () => {
        expect(exampleTabTitle(CREATED)).toBe('');
    });

    it('is the name the example has in its request', () => {
        requestsStore.getState().beginRead(ITEM);
        requestsStore.getState().finishRead(ITEM, {
            ...REQUEST,
            examples: [{ body: '', contentType: '', name: 'Pedido/ok', status: '201' }],
        });

        expect(
            exampleTabTitle(exampleResource('Local', 'local', 'crear-pedido', 'Pedido-ok')),
        ).toBe('Pedido/ok');
    });

    it('is empty, and not the resource, when it names no example', () => {
        expect(exampleTabTitle('nada')).toBe('');
    });
});
