import { itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import {
    formatResourceUri,
    REQUEST_ITEM_KIND,
    type RequestExample,
    type RequestItem,
} from '@mandor/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { writeExampleParts } from '../../../../src/renderer/features/requests/lib/write-example-parts.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';

const RESOURCE = itemResource('Local', 'local', 'crear-pedido');

const CREATED: RequestExample = {
    body: '{}',
    contentType: 'application/json',
    name: 'Creado',
    status: '201',
};
const MISSING: RequestExample = {
    body: '',
    contentType: 'text/plain',
    name: 'Nada',
    status: '404',
};

const REQUEST: RequestItem = {
    body: { type: 'none' },
    examples: [CREATED],
    headers: [],
    method: 'GET',
    name: 'crear pedido',
    pathParams: [],
    query: [],
    settings: { followRedirects: true, maxRedirects: 5, timeoutMs: 30000, validateTls: true },
    url: '',
};

/** The write the bridge hears, as the caller built it. */
type WriteCall = { fields?: Record<string, unknown> };

function fileWith(examples: RequestExample[]) {
    return vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
        success({
            examples,
            kind: REQUEST_ITEM_KIND,
            method: 'GET',
            name: 'crear pedido',
            url: '',
        }),
    );
}

function writes() {
    return vi.spyOn(window.mandor.collections, 'writeItem').mockResolvedValue(success({}));
}

describe('writing the examples of a request', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        requestsStore.getState().reset();
        requestsStore.getState().beginRead(RESOURCE);
        requestsStore.getState().finishRead(RESOURCE, REQUEST);
    });

    it('reads the tree again once the file is written, and not when the write is refused', async () => {
        fileWith([CREATED]);

        const tree = vi.spyOn(window.mandor.collections, 'tree').mockResolvedValue(success([]));

        writes();
        await writeExampleParts(RESOURCE, (parts) => parts);

        expect(tree).toHaveBeenCalledWith({ workspaceId: 'local' });

        tree.mockClear();
        vi.spyOn(window.mandor.collections, 'writeItem').mockResolvedValue({
            error: { code: 'fs-write', message: 'no' },
            ok: false,
        });
        await writeExampleParts(RESOURCE, (parts) => parts);

        expect(tree).not.toHaveBeenCalled();
    });

    it('reads the file fresh and writes only the examples', async () => {
        fileWith([CREATED, MISSING]);

        const writeItem = writes();

        await expect(
            writeExampleParts(RESOURCE, (parts) => ({ examples: parts.examples.slice(0, 1) })),
        ).resolves.toBeNull();

        expect((writeItem.mock.calls[0]?.[0] as WriteCall).fields).toEqual({
            examples: [CREATED],
            kind: REQUEST_ITEM_KIND,
            name: 'crear pedido',
        });
    });

    it('leaves the key out when no example is left', async () => {
        fileWith([CREATED]);

        const writeItem = writes();

        await writeExampleParts(RESOURCE, () => ({ examples: [] }));

        expect((writeItem.mock.calls[0]?.[0] as WriteCall).fields).toHaveProperty(
            'examples',
            undefined,
        );
    });

    it('carries into its examples the schema an old file kept per status, and drops the old key', async () => {
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
            success({
                examples: [CREATED],
                kind: REQUEST_ITEM_KIND,
                name: 'crear pedido',
                responseSchemas: { '201': '{"type":"object"}' },
            }),
        );

        const writeItem = writes();

        await writeExampleParts(RESOURCE, (parts) => parts);

        const fields = (writeItem.mock.calls[0]?.[0] as WriteCall).fields;

        expect(fields?.['examples']).toEqual([{ ...CREATED, schema: '{"type":"object"}' }]);
        expect(fields).toHaveProperty('responseSchemas', undefined);
    });

    it('brings the window to agree with the file, its draft too', async () => {
        fileWith([CREATED]);
        writes();
        requestsStore.getState().setPending(RESOURCE, {
            before: REQUEST,
            request: { ...REQUEST, url: '/x' },
        });

        await writeExampleParts(RESOURCE, (parts) => ({ examples: [...parts.examples, MISSING] }));

        const state = requestsStore.getState();

        expect(state.requests[RESOURCE]?.examples).toEqual([CREATED, MISSING]);
        expect(state.pendings[RESOURCE]?.before?.examples).toEqual([CREATED, MISSING]);
        expect(state.pendings[RESOURCE]?.request).toMatchObject({
            examples: [CREATED, MISSING],
            url: '/x',
        });
    });

    it('answers the code of a read that failed and writes nothing', async () => {
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue({
            error: { code: 'fs-read', message: 'gone' },
            ok: false,
        });

        const writeItem = writes();

        await expect(writeExampleParts(RESOURCE, (parts) => parts)).resolves.toBe('fs-read');
        expect(writeItem).not.toHaveBeenCalled();
    });

    it('answers a file code for a file that is not a readable request', async () => {
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
            success({ kind: REQUEST_ITEM_KIND, name: '' }),
        );

        const writeItem = writes();

        await expect(writeExampleParts(RESOURCE, (parts) => parts)).resolves.toBe('fs-read');
        expect(writeItem).not.toHaveBeenCalled();
    });

    it('answers the code of a refusal and leaves the window as it was', async () => {
        fileWith([CREATED]);
        vi.spyOn(window.mandor.collections, 'writeItem').mockResolvedValue({
            error: { code: 'fs-write', message: 'denied' },
            ok: false,
        });

        await expect(writeExampleParts(RESOURCE, () => ({ examples: [] }))).resolves.toBe(
            'fs-write',
        );
        expect(requestsStore.getState().requests[RESOURCE]?.examples).toEqual([CREATED]);
    });

    it('does nothing for a resource that is not an item', async () => {
        const readItem = fileWith([]);

        await expect(
            writeExampleParts(formatResourceUri({ scope: 'app', name: 'nada' }), (parts) => parts),
        ).resolves.toBeNull();
        expect(readItem).not.toHaveBeenCalled();
    });
});
