import { collectionStore, itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import type { RequestItem } from '@mandor/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    editRequest,
    saveRequest,
} from '../../../../src/renderer/features/requests/lib/pending-request-write.js';
import {
    requestsStore,
    type RequestsStoreApi,
} from '../../../../src/renderer/features/requests/requests-store.js';

const RESOURCE = itemResource('Local', 'local', 'crear-pedido');

/** The write the bridge hears, as the caller built it. */
type WriteCall = { fields?: Record<string, unknown> };

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

describe('the draft of a request', () => {
    let store: RequestsStoreApi;

    beforeEach(() => {
        vi.restoreAllMocks();
        store = requestsStore;
        store.getState().reset();
        store.getState().beginRead(RESOURCE);
        store.getState().finishRead(RESOURCE, REQUEST);
    });

    function writesWith(): ReturnType<typeof vi.fn> {
        return vi.spyOn(window.mandor.collections, 'writeItem').mockResolvedValue(success({}));
    }

    it('an edit puts the draft in front of the file, and nothing reaches the disk', () => {
        const writeItem = writesWith();

        editRequest(RESOURCE, { ...REQUEST, url: '{{baseUrl}}' });

        expect(store.getState().requests[RESOURCE]?.url).toBe('{{baseUrl}}');
        expect(store.getState().pendings[RESOURCE]).toEqual({
            before: REQUEST,
            request: { ...REQUEST, url: '{{baseUrl}}' },
        });
        expect(writeItem).not.toHaveBeenCalled();
    });

    it('saving keeps the name the item took after the draft was read', async () => {
        const writeItem = writesWith();

        collectionStore.getState().setNodes([
            {
                examples: [],
                itemKind: 'request',
                kind: 'item',
                name: 'alta de pedido',
                path: 'crear-pedido',
                tags: [],
            },
        ]);
        editRequest(RESOURCE, { ...REQUEST, url: '/nueva' });
        await saveRequest(RESOURCE);

        const [call] = writeItem.mock.calls[0] as [WriteCall];

        expect(call.fields?.['name']).toBe('alta de pedido');
    });

    it('saving puts the draft on the file and lets go of it', async () => {
        const writeItem = writesWith();

        editRequest(RESOURCE, { ...REQUEST, url: '{{baseUrl}}' });

        await expect(saveRequest(RESOURCE)).resolves.toBeNull();

        expect(writeItem).toHaveBeenCalledOnce();
        expect((writeItem.mock.calls[0]?.[0] as WriteCall).fields).toMatchObject({
            url: '{{baseUrl}}',
        });
        expect(store.getState().pendings[RESOURCE]).toBeUndefined();
    });

    it('an edit that goes back to what the disk holds lets the draft go', () => {
        const writeItem = writesWith();

        editRequest(RESOURCE, { ...REQUEST, url: '{{baseUrl}}' });

        expect(store.getState().pendings[RESOURCE]).not.toBeUndefined();

        editRequest(RESOURCE, { ...REQUEST, url: '' });

        expect(store.getState().pendings[RESOURCE]).toBeUndefined();
        expect(writeItem).not.toHaveBeenCalled();
    });

    it('a request with no draft has nothing to save', async () => {
        const writeItem = writesWith();

        await expect(saveRequest(RESOURCE)).resolves.toBeNull();

        expect(writeItem).not.toHaveBeenCalled();
    });

    it('a refusal keeps the draft and answers the code', async () => {
        vi.spyOn(window.mandor.collections, 'writeItem').mockResolvedValue({
            error: { code: 'fs-write', message: 'denied' },
            ok: false,
        });

        editRequest(RESOURCE, { ...REQUEST, url: '{{baseUrl}}' });

        await expect(saveRequest(RESOURCE)).resolves.toBe('fs-write');

        expect(store.getState().requests[RESOURCE]?.url).toBe('{{baseUrl}}');
        expect(store.getState().pendings[RESOURCE]?.request.url).toBe('{{baseUrl}}');
    });

    it('saving carries no examples: the tabs of the examples write them', async () => {
        const writeItem = writesWith();

        editRequest(RESOURCE, {
            ...REQUEST,
            examples: [{ body: '', contentType: '', name: 'Creado', status: '201' }],
            url: '{{baseUrl}}',
        });
        await saveRequest(RESOURCE);

        expect((writeItem.mock.calls[0]?.[0] as WriteCall).fields).not.toHaveProperty('examples');
    });
});
