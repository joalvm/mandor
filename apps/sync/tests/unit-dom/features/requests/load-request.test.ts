import { itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadRequest } from '../../../../src/renderer/features/requests/lib/load-request.js';
import {
    requestsStore,
    type RequestsStoreApi,
} from '../../../../src/renderer/features/requests/requests-store.js';

const RESOURCE = itemResource('Local', 'local', 'crear-pedido');

const BODY = {
    kind: 'request',
    method: 'POST',
    name: 'crear pedido',
    url: '{{baseUrl}}/pedidos',
};

describe('loadRequest', () => {
    let store: RequestsStoreApi;

    beforeEach(() => {
        vi.restoreAllMocks();
        store = requestsStore;
        store.getState().reset();
    });

    it('brings one item off disk and files it whole', async () => {
        const readItem = vi
            .spyOn(window.mandor.collections, 'readItem')
            .mockResolvedValue(success(BODY));

        expect(await loadRequest(RESOURCE)).toBeNull();

        expect(readItem).toHaveBeenCalledOnce();
        expect(store.getState().requests[RESOURCE]).toEqual({
            body: { type: 'none' },
            examples: [],
            headers: [],
            method: 'POST',
            name: 'crear pedido',
            pathParams: [],
            query: [],
            settings: {},
            url: '{{baseUrl}}/pedidos',
        });
    });

    it('a second view asks nothing: the read of the first is the answer for both', async () => {
        const readItem = vi
            .spyOn(window.mandor.collections, 'readItem')
            .mockResolvedValue(success(BODY));

        await loadRequest(RESOURCE);
        await loadRequest(RESOURCE);

        expect(readItem).toHaveBeenCalledOnce();
    });

    it('a body Mandor cannot read is a file fault, and the resource stays empty', async () => {
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
            success({ kind: 'request', name: 'crear pedido', method: 'post' }),
        );

        expect(await loadRequest(RESOURCE)).toBe('fs-read');
        expect(store.getState().requests[RESOURCE]).toBeUndefined();
    });

    it('a read that the bridge refuses hands the code over', async () => {
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue({
            error: { code: 'fs-read', message: 'no such file' },
            ok: false,
        });

        expect(await loadRequest(RESOURCE)).toBe('fs-read');
    });

    it('a resource that is no URI at all is refused, not read', async () => {
        const readItem = vi.spyOn(window.mandor.collections, 'readItem');

        await expect(loadRequest('no-es-un-recurso')).rejects.toThrow();
        expect(readItem).not.toHaveBeenCalled();
    });
});
