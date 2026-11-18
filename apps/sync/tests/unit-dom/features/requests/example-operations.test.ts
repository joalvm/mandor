import { collectionStore, exampleResource, itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { formatResourceUri, REQUEST_ITEM_KIND, type RequestExample } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    duplicateExample,
    newExample,
    removeExamples,
    renameExample,
} from '../../../../src/renderer/features/requests/lib/example-operations.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';

const ITEM = itemResource('Local', 'local', 'crear-pedido');
const CREATED = exampleResource('Local', 'local', 'crear-pedido', 'Creado');
const ROTO = exampleResource('Local', 'local', 'crear-pedido', 'Roto');
const OTHER = exampleResource('Local', 'local', 'listar-pedidos', 'Creado');

const FIRST: RequestExample = {
    body: '{}',
    contentType: 'application/json',
    name: 'Creado',
    status: '201',
};
const EXAMPLES: RequestExample[] = [
    FIRST,
    { body: '', contentType: 'text/plain', name: 'Roto', status: '500' },
    { body: '', contentType: 'text/plain', name: 'Vacio', status: '204' },
];

type WriteCall = { fields?: { examples?: RequestExample[] } };

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

function refusing() {
    return vi
        .spyOn(window.mandor.collections, 'writeItem')
        .mockResolvedValue({ error: { code: 'fs-write', message: 'no' }, ok: false });
}

function namesWritten(writeItem: ReturnType<typeof writes>, call = 0): string[] {
    const fields = (writeItem.mock.calls[call]?.[0] as WriteCall).fields;

    return (fields?.examples ?? []).map((each) => each.name);
}

function openTab(resource: string): void {
    const shell = shellStore.getState();

    shell.openTab(shell.activeGroupId, {
        id: `tab-${resource}`,
        kind: 'request-example',
        resource,
    });
}

describe('what the tree does to the examples of a request', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        requestsStore.getState().reset();
        shellStore.getState().reset();
        collectionStore.getState().reset();
        shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
        shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
        fileWith(EXAMPLES);
    });

    describe('renaming', () => {
        it('writes the name, and the tab and the draft follow the new resource', async () => {
            const writeItem = writes();
            const alta = exampleResource('Local', 'local', 'crear-pedido', 'Alta');

            openTab(CREATED);
            requestsStore.getState().setExampleDraft(CREATED, {
                example: { ...FIRST, schema: '{}', status: '200' },
            });

            await expect(renameExample(CREATED, '  Alta  ')).resolves.toBeNull();

            expect(namesWritten(writeItem)).toEqual(['Alta', 'Roto', 'Vacio']);
            expect(shellStore.getState().resources[alta]?.tabs).toEqual([`tab-${CREATED}`]);
            expect(requestsStore.getState().exampleDrafts[CREATED]).toBeUndefined();
            expect(requestsStore.getState().exampleDrafts[alta]?.example).toMatchObject({
                name: 'Alta',
                schema: '{}',
                status: '200',
            });
        });

        it('numbers a name another example already wears', async () => {
            const writeItem = writes();

            await renameExample(CREATED, 'Roto');

            expect(namesWritten(writeItem)).toEqual(['Roto (2)', 'Roto', 'Vacio']);
        });

        it('moves nothing when the key stays the same', async () => {
            writes();
            requestsStore.getState().setExampleDraft(CREATED, { example: FIRST });

            await renameExample(CREATED, 'Creado');

            expect(requestsStore.getState().exampleDrafts[CREATED]).toBeDefined();
        });

        it('writes nothing for an empty name', async () => {
            const writeItem = writes();

            await expect(renameExample(CREATED, '   ')).resolves.toBeNull();

            expect(writeItem).not.toHaveBeenCalled();
        });

        it('answers the refusal and moves nothing', async () => {
            refusing();
            requestsStore.getState().setExampleDraft(CREATED, { example: FIRST });

            await expect(renameExample(CREATED, 'Alta')).resolves.toBe('fs-write');

            expect(requestsStore.getState().exampleDrafts[CREATED]).toBeDefined();
        });
    });

    describe('duplicating', () => {
        it('puts the copy right behind the original, under a name nobody wears', async () => {
            const writeItem = writes();

            await expect(duplicateExample(CREATED, 'copy')).resolves.toBeNull();

            expect(namesWritten(writeItem)).toEqual(['Creado', 'Creado copy', 'Roto', 'Vacio']);
        });

        it('opens the copy kept', async () => {
            writes();

            await duplicateExample(CREATED, 'copy');

            const copy = exampleResource('Local', 'local', 'crear-pedido', 'Creado copy');

            expect(shellStore.getState().resources[copy]?.tabs).toHaveLength(1);
        });

        it('copies nothing the file lost', async () => {
            const writeItem = writes();

            await duplicateExample(
                exampleResource('Local', 'local', 'crear-pedido', 'Nada'),
                'copy',
            );

            expect(namesWritten(writeItem)).toEqual(['Creado', 'Roto', 'Vacio']);
        });
    });

    describe('removing', () => {
        it('writes once for each request and blanks the tab of what went', async () => {
            const writeItem = writes();

            openTab(CREATED);

            await expect(removeExamples([CREATED, ROTO, OTHER])).resolves.toBeNull();

            expect(writeItem).toHaveBeenCalledTimes(2);
            expect(namesWritten(writeItem)).toEqual(['Vacio']);
            expect(shellStore.getState().resources[CREATED]?.missing).toBe(true);
        });

        it('keeps the key of a repeated name once the first of them goes', async () => {
            const writeItem = writes();

            fileWith([FIRST, { ...FIRST, status: '200' }]);

            await removeExamples([CREATED]);

            expect(namesWritten(writeItem)).toEqual(['Creado (2)']);
        });

        it('leaves the draft where it was', async () => {
            writes();
            requestsStore.getState().setExampleDraft(CREATED, { example: FIRST });

            await removeExamples([CREATED]);

            expect(requestsStore.getState().exampleDrafts[CREATED]).toBeDefined();
        });

        it('answers the first refusal and goes on with the other request', async () => {
            const writeItem = vi
                .spyOn(window.mandor.collections, 'writeItem')
                .mockResolvedValueOnce({ error: { code: 'fs-write', message: 'no' }, ok: false })
                .mockResolvedValueOnce(success({}));

            openTab(CREATED);
            openTab(OTHER);

            await expect(removeExamples([CREATED, OTHER])).resolves.toBe('fs-write');

            expect(writeItem).toHaveBeenCalledTimes(2);
            expect(shellStore.getState().resources[CREATED]?.missing).toBe(false);
            expect(shellStore.getState().resources[OTHER]?.missing).toBe(true);
        });
    });

    describe('making a new one', () => {
        it('adds a 200 JSON example, shows the examples of the request and opens it', async () => {
            const writeItem = writes();

            await expect(newExample(ITEM, 'New example')).resolves.toBeNull();

            const written = (writeItem.mock.calls[0]?.[0] as WriteCall).fields?.examples;

            expect(written?.at(-1)).toEqual({
                body: '',
                contentType: 'application/json',
                name: 'New example',
                status: '200',
            });
            expect(collectionStore.getState().examplesClosed['local'] ?? []).not.toContain(
                'crear-pedido',
            );
            expect(
                shellStore.getState().resources[
                    exampleResource('Local', 'local', 'crear-pedido', 'New example')
                ]?.tabs,
            ).toHaveLength(1);
        });

        it('numbers the name when one already wears it', async () => {
            const writeItem = writes();

            fileWith([
                ...EXAMPLES,
                { body: '', contentType: '', name: 'New example', status: '200' },
            ]);
            await newExample(ITEM, 'New example');

            expect(namesWritten(writeItem).at(-1)).toBe('New example (2)');
        });

        it('writes nothing for a resource that is no request of a collection', async () => {
            const writeItem = writes();

            await expect(
                newExample(formatResourceUri({ scope: 'app', name: 'welcome' }), 'x'),
            ).resolves.toBeNull();

            expect(writeItem).not.toHaveBeenCalled();
        });
    });
});
