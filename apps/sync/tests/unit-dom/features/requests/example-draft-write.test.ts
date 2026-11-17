import { exampleResource, itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { REQUEST_ITEM_KIND, type RequestExample, type RequestItem } from '@mandor/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    editExample,
    editExampleSchema,
    exampleAt,
    saveExample,
} from '../../../../src/renderer/features/requests/lib/example-draft-write.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';

const ITEM = itemResource('Local', 'local', 'crear-pedido');
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
    examples: [CREATED, MISSING],
    headers: [],
    method: 'GET',
    name: 'crear pedido',
    pathParams: [],
    query: [],
    settings: { followRedirects: true, maxRedirects: 5, timeoutMs: 30000, validateTls: true },
    url: '',
};
const RESOURCE = exampleResource('Local', 'local', 'crear-pedido', 'Creado');

/** The write the bridge hears, as the caller built it. */
type WriteCall = {
    fields?: { examples?: RequestExample[] };
};

function fileHolds(examples: RequestExample[]): void {
    vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
        success({
            examples,
            kind: REQUEST_ITEM_KIND,
            method: 'GET',
            name: 'crear pedido',
            url: '',
        }),
    );
}

describe('the draft of an example', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        requestsStore.getState().reset();
        requestsStore.getState().beginRead(ITEM);
        requestsStore.getState().finishRead(ITEM, REQUEST);
    });

    it('finds an example of a request by its key', () => {
        expect(exampleAt(REQUEST, 'Nada')).toEqual(MISSING);
        expect(exampleAt(REQUEST, 'otro')).toBeUndefined();
        expect(exampleAt(undefined, 'Nada')).toBeUndefined();
    });

    it('an edit becomes a draft', () => {
        editExample(RESOURCE, { ...CREATED, status: '200' });

        expect(requestsStore.getState().exampleDrafts[RESOURCE]).toEqual({
            example: { ...CREATED, status: '200' },
        });
    });

    it('an edit that goes back to what the file holds lets the draft go', () => {
        editExample(RESOURCE, { ...CREATED, status: '200' });
        editExample(RESOURCE, CREATED);

        expect(requestsStore.getState().exampleDrafts[RESOURCE]).toBeUndefined();
    });

    it('an edit of a resource that is no example does nothing', () => {
        editExample(ITEM, CREATED);

        expect(requestsStore.getState().exampleDrafts).toEqual({});
    });

    it('saving puts the draft in the place of its example and lets go of it', async () => {
        fileHolds([CREATED, MISSING]);

        const writeItem = vi
            .spyOn(window.mandor.collections, 'writeItem')
            .mockResolvedValue(success({}));

        editExample(RESOURCE, { ...CREATED, status: '200' });

        await expect(saveExample(RESOURCE)).resolves.toBeNull();

        expect((writeItem.mock.calls[0]?.[0] as WriteCall).fields?.examples).toEqual([
            { ...CREATED, status: '200' },
            MISSING,
        ]);
        expect(requestsStore.getState().exampleDrafts[RESOURCE]).toBeUndefined();
    });

    it('a refusal puts the draft back and answers the code', async () => {
        fileHolds([CREATED, MISSING]);
        vi.spyOn(window.mandor.collections, 'writeItem').mockResolvedValue({
            error: { code: 'fs-write', message: 'denied' },
            ok: false,
        });
        editExample(RESOURCE, { ...CREATED, status: '200' });

        await expect(saveExample(RESOURCE)).resolves.toBe('fs-write');

        expect(requestsStore.getState().exampleDrafts[RESOURCE]).toEqual({
            example: { ...CREATED, status: '200' },
        });
    });

    it('an example with no draft has nothing to save', async () => {
        const writeItem = vi.spyOn(window.mandor.collections, 'writeItem');

        await expect(saveExample(RESOURCE)).resolves.toBeNull();
        expect(writeItem).not.toHaveBeenCalled();
    });

    describe('with the schema of its answer', () => {
        const SCHEMA = '{"type":"object"}';

        it('keeps the text of the schema in the example, as it stands', () => {
            editExampleSchema(RESOURCE, SCHEMA);

            expect(requestsStore.getState().exampleDrafts[RESOURCE]).toEqual({
                example: { ...CREATED, schema: SCHEMA },
            });
        });

        it('an edit of the example keeps the schema typed before it', () => {
            editExampleSchema(RESOURCE, SCHEMA);
            editExample(RESOURCE, {
                ...(requestsStore.getState().exampleDrafts[RESOURCE]?.example ?? CREATED),
                body: '{"a":1}',
            });

            expect(requestsStore.getState().exampleDrafts[RESOURCE]).toEqual({
                example: { ...CREATED, body: '{"a":1}', schema: SCHEMA },
            });
        });

        it('a text that says what the file says, or nothing where the file has none, is no draft', () => {
            editExampleSchema(RESOURCE, SCHEMA);
            editExampleSchema(RESOURCE, '');

            expect(requestsStore.getState().exampleDrafts[RESOURCE]).toBeUndefined();

            requestsStore.getState().setRequest(ITEM, {
                ...REQUEST,
                examples: [{ ...CREATED, schema: SCHEMA }, MISSING],
            });
            editExampleSchema(RESOURCE, SCHEMA);

            expect(requestsStore.getState().exampleDrafts[RESOURCE]).toBeUndefined();
        });

        it('an edit of a resource that is no example does nothing', () => {
            editExampleSchema(ITEM, SCHEMA);

            expect(requestsStore.getState().exampleDrafts).toEqual({});
        });

        it('saving writes the schema with its example', async () => {
            fileHolds([CREATED, MISSING]);

            const writeItem = vi
                .spyOn(window.mandor.collections, 'writeItem')
                .mockResolvedValue(success({}));

            editExampleSchema(RESOURCE, SCHEMA);
            await saveExample(RESOURCE);

            expect(writeItem).toHaveBeenCalledOnce();
            expect((writeItem.mock.calls[0]?.[0] as WriteCall).fields?.examples).toEqual([
                { ...CREATED, schema: SCHEMA },
                MISSING,
            ]);
        });

        it('an empty text takes the schema out of the example', async () => {
            requestsStore.getState().setRequest(ITEM, {
                ...REQUEST,
                examples: [{ ...CREATED, schema: SCHEMA }, MISSING],
            });
            fileHolds([{ ...CREATED, schema: SCHEMA }, MISSING]);

            const writeItem = vi
                .spyOn(window.mandor.collections, 'writeItem')
                .mockResolvedValue(success({}));

            editExampleSchema(RESOURCE, ' ');
            await saveExample(RESOURCE);

            expect((writeItem.mock.calls[0]?.[0] as WriteCall).fields?.examples?.[0]).toEqual(
                CREATED,
            );
        });
    });
});
