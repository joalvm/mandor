import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ImportPlanEntry } from '@mandor/interop-core';
import {
    createWorkspace,
    writeRepoTree,
    listEnvironments,
    readItem,
    readWorkspace,
    writeEnvironment,
    writeImportedWorkspace,
} from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { removeEntry, writeEntry } from '../../src/import/write-entry.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-write-places-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'pasarela', name: 'Pasarela', kind: 'async' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

const origin = { kind: 'asyncapi', sourceId: 'abc' } as const;

function itemOf(itemKind: string | null): ImportPlanEntry {
    return {
        class: 'add',
        place: 'item',
        route: 'pedidos/registrarpedido',
        name: 'registrarPedido',
        selected: true,
        resource: {
            place: 'item',
            itemKind,
            route: 'pedidos/registrarpedido',
            name: 'registrarPedido',
            fields: {},
            origin,
            degradations: [],
        },
    };
}

function removalOf(place: 'environment' | 'workspace', route: string): ImportPlanEntry {
    return { class: 'removal', place, route, name: 'Prod', resource: null, selected: true };
}

describe('writeEntry of a kind other than a message', () => {
    it('writes the item with the kind its resource names', async () => {
        await writeEntry(root, 'pasarela', itemOf('request'), origin);

        expect(await readItem(root, 'pasarela', 'pedidos/registrarpedido')).toMatchObject({
            kind: 'request',
            origin,
        });
    });

    it('refuses an item whose resource names no kind', async () => {
        await expect(writeEntry(root, 'pasarela', itemOf(null), origin)).rejects.toThrow(
            /names no kind/,
        );
    });
});

describe('removeEntry of an environment and of the workspace file', () => {
    it('deletes the environment file', async () => {
        await writeEnvironment(root, 'pasarela', { id: 'prod', name: 'Prod', variables: [] });

        await removeEntry(root, 'pasarela', removalOf('environment', 'prod'));

        expect((await listEnvironments(root, 'pasarela')).environments).toEqual([]);
    });

    it('takes the auth and its origin out of the workspace file', async () => {
        await writeImportedWorkspace(
            root,
            'pasarela',
            { auth: { type: 'bearer', token: 't' }, importedScripts: null },
            origin,
        );

        await removeEntry(root, 'pasarela', removalOf('workspace', '.'));

        const read = await readWorkspace(root, 'pasarela');

        expect(read.ok && read.value.auth).toBeUndefined();
        expect(read.ok && read.value.importOrigin).toBeUndefined();
    });
});
