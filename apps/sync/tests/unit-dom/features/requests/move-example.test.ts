import { collectionStore, exampleResource, itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { REQUEST_ITEM_KIND, type RequestExample } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { describe, expect, it, vi } from 'vitest';

import { moveExample } from '../../../../src/renderer/features/requests/lib/move-example.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';

const FROM = itemResource('Local', 'local', 'crear');
const TO = itemResource('Local', 'local', 'listar');
const CREATED = exampleResource('Local', 'local', 'crear', 'Creado');
const LANDED = exampleResource('Local', 'local', 'listar', 'Creado');

const EXAMPLE: RequestExample = {
    body: '{}',
    contentType: 'application/json',
    name: 'Creado',
    schema: '{"type":"object"}',
    status: '201',
};
const OTHER: RequestExample = { ...EXAMPLE, name: 'Roto', status: '500' };

type WriteArgument = { fields?: { examples?: RequestExample[] }; path: string };

function files(byPath: Readonly<Record<string, RequestExample[]>>) {
    vi.spyOn(window.mandor.collections, 'readItem').mockImplementation(({ path }) =>
        Promise.resolve(
            success({
                examples: byPath[path] ?? [],
                kind: REQUEST_ITEM_KIND,
                method: 'GET',
                name: path,
                url: '',
            }),
        ),
    );
}

function writes() {
    return vi.spyOn(window.mandor.collections, 'writeItem').mockResolvedValue(success({}));
}

function namesIn(writeItem: ReturnType<typeof writes>, call: number): readonly string[] {
    const argument = writeItem.mock.calls[call]?.[0] as WriteArgument;

    return (argument.fields?.examples ?? []).map((each) => each.name);
}

function pathOf(writeItem: ReturnType<typeof writes>, call: number): string | undefined {
    return (writeItem.mock.calls[call]?.[0] as WriteArgument).path;
}

describe('an example carried to another request (moveExample)', () => {
    it('lands whole at the destination and leaves where it was', async () => {
        files({ crear: [EXAMPLE, OTHER], listar: [] });
        const writeItem = writes();

        await expect(moveExample(CREATED, TO)).resolves.toBeNull();

        expect(pathOf(writeItem, 0)).toBe('listar');
        expect(namesIn(writeItem, 0)).toEqual(['Creado']);
        expect(pathOf(writeItem, 1)).toBe('crear');
        expect(namesIn(writeItem, 1)).toEqual(['Roto']);

        const landed = writeItem.mock.calls[0]?.[0] as WriteArgument;

        expect(landed.fields?.examples?.[0]).toEqual(EXAMPLE);
    });

    it('takes a free name when the destination already wears it', async () => {
        files({ crear: [EXAMPLE], listar: [EXAMPLE] });
        const writeItem = writes();

        await moveExample(CREATED, TO);

        expect(namesIn(writeItem, 0)).toEqual(['Creado', 'Creado (2)']);
    });

    it('takes its tab and its draft along, and opens the destination', async () => {
        files({ crear: [EXAMPLE], listar: [] });
        writes();
        collectionStore.getState().openExamples('local', 'listar', false);
        const moveResource = vi.spyOn(shellStore.getState(), 'moveResource');

        requestsStore.getState().setExampleDraft(CREATED, { example: EXAMPLE });

        await moveExample(CREATED, TO);

        expect(moveResource).toHaveBeenCalledWith(CREATED, LANDED);
        expect(requestsStore.getState().exampleDrafts[CREATED]).toBeUndefined();
        expect(requestsStore.getState().exampleDrafts[LANDED]?.example.name).toBe('Creado');
        expect(collectionStore.getState().examplesClosed['local'] ?? []).not.toContain('listar');
    });

    it('leaves it where it was when the destination refuses', async () => {
        files({ crear: [EXAMPLE], listar: [] });
        const writeItem = vi
            .spyOn(window.mandor.collections, 'writeItem')
            .mockResolvedValue({ error: { code: 'fs-write', message: 'no' }, ok: false });

        await expect(moveExample(CREATED, TO)).resolves.toBe('fs-write');

        expect(writeItem).toHaveBeenCalledTimes(1);
    });

    it('answers why it could not be read', async () => {
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue({
            error: { code: 'fs-read', message: 'no' },
            ok: false,
        });
        const writeItem = writes();

        await expect(moveExample(CREATED, TO)).resolves.toBe('fs-read');
        expect(writeItem).not.toHaveBeenCalled();
    });

    it('does nothing onto its own request, or when it is no longer there', async () => {
        files({ crear: [OTHER], listar: [] });
        const writeItem = writes();

        await expect(moveExample(CREATED, FROM)).resolves.toBeNull();
        await expect(moveExample(CREATED, TO)).resolves.toBeNull();
        await expect(moveExample('not a resource', TO)).resolves.toBeNull();
        expect(writeItem).not.toHaveBeenCalled();
    });
});
