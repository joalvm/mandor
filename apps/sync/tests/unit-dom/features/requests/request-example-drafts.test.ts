import { exampleResource, itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { REQUEST_ITEM_KIND, type RequestExample, type RequestItem } from '@mandor/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { editExampleSchema } from '../../../../src/renderer/features/requests/lib/example-draft-write.js';
import { editRequest } from '../../../../src/renderer/features/requests/lib/pending-request-write.js';
import {
    requestHasDraft,
    saveRequestAndExamples,
} from '../../../../src/renderer/features/requests/lib/request-example-drafts.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';

const ITEM = itemResource('Local', 'local', 'crear-pedido');
const OTHER = itemResource('Local', 'local', 'otro');
const LIST: RequestExample = {
    body: '[]',
    contentType: 'application/json',
    name: 'Lista',
    status: '200',
};
const PAGED: RequestExample = { ...LIST, name: 'Paginado' };
const REQUEST: RequestItem = {
    body: { type: 'none' },
    examples: [LIST, PAGED],
    headers: [],
    method: 'GET',
    name: 'crear pedido',
    pathParams: [],
    query: [],
    settings: { followRedirects: true, maxRedirects: 5, timeoutMs: 30000, validateTls: true },
    url: '',
};
const LIST_RESOURCE = exampleResource('Local', 'local', 'crear-pedido', 'Lista');
const PAGED_RESOURCE = exampleResource('Local', 'local', 'crear-pedido', 'Paginado');
const SCHEMA = '{"type":"array"}';

/** The write the bridge hears, as the caller built it. */
type WriteCall = { fields?: { examples?: RequestExample[]; url?: string } };

function state() {
    return requestsStore.getState();
}

describe('the drafts a request keeps with its examples', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        state().reset();
        state().beginRead(ITEM);
        state().finishRead(ITEM, REQUEST);
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
            success({
                examples: [LIST, PAGED],
                kind: REQUEST_ITEM_KIND,
                method: 'GET',
                name: 'crear pedido',
                url: '',
            }),
        );
    });

    it('holds work while the request or one of its examples has a draft, and only its own', () => {
        expect(requestHasDraft(state(), ITEM)).toBe(false);

        editExampleSchema(PAGED_RESOURCE, SCHEMA);

        expect(requestHasDraft(state(), ITEM)).toBe(true);
        expect(requestHasDraft(state(), OTHER)).toBe(false);

        state().clearExampleDraft(PAGED_RESOURCE);
        editRequest(ITEM, { ...REQUEST, url: '/pedidos' });

        expect(requestHasDraft(state(), ITEM)).toBe(true);
    });

    it('saves the request, then each example with a draft, and lets go of every draft', async () => {
        const writeItem = vi
            .spyOn(window.mandor.collections, 'writeItem')
            .mockResolvedValue(success({}));

        editRequest(ITEM, { ...REQUEST, url: '/pedidos' });
        editExampleSchema(LIST_RESOURCE, SCHEMA);
        editExampleSchema(PAGED_RESOURCE, SCHEMA);

        await expect(saveRequestAndExamples(ITEM)).resolves.toBeNull();

        const writes = writeItem.mock.calls.map((call) => (call[0] as WriteCall).fields);

        expect(writes).toHaveLength(3);
        expect(writes[0]?.url).toBe('/pedidos');
        expect(writes[1]?.examples?.[0]?.schema).toBe(SCHEMA);
        expect(writes[2]?.examples?.[1]?.schema).toBe(SCHEMA);
        expect(requestHasDraft(state(), ITEM)).toBe(false);
    });

    it('stops at the first refusal and keeps the drafts it did not write', async () => {
        const writeItem = vi.spyOn(window.mandor.collections, 'writeItem').mockResolvedValue({
            error: { code: 'fs-write', message: 'no' },
            ok: false,
        });

        editExampleSchema(LIST_RESOURCE, SCHEMA);
        editExampleSchema(PAGED_RESOURCE, SCHEMA);

        await expect(saveRequestAndExamples(ITEM)).resolves.toBe('fs-write');

        expect(writeItem).toHaveBeenCalledOnce();
        expect(state().exampleDrafts[LIST_RESOURCE]?.example.schema).toBe(SCHEMA);
        expect(state().exampleDrafts[PAGED_RESOURCE]?.example.schema).toBe(SCHEMA);
    });
});
