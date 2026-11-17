import { simpleGit } from 'simple-git';

import { listConnections, listDocs, readCollectionTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CHANNELS, type ImportApplied, type Result } from '@mandor/ipc';

import {
    readPasarela,
    importRepo,
    startImportWorkspace,
    stopImportWorkspace,
    type ImportWorkspace,
} from './support/import-workspace.js';

const repo = importRepo();

let workspace: ImportWorkspace;

beforeEach(async () => {
    workspace = await startImportWorkspace(repo);
});

afterEach(async () => {
    await stopImportWorkspace(workspace);
});

function refuse(): Promise<Result<ImportApplied>> {
    return workspace.ipc.call(CHANNELS.importApply, {
        target: { workspaceId: 'pasarela' },
        name: 'Pasarela',
        plan: { identity: null, entries: [{ class: 'bogus' }] },
    }) as Promise<Result<ImportApplied>>;
}

describe('applying the plan of an import', () => {
    it('writes the whole import as one commit, and the tree is clean after it', async () => {
        const before = await simpleGit(workspace.root).log();

        await workspace.firstImport();

        const after = await simpleGit(workspace.root).log();

        expect(after.total).toBe(before.total + 1);
        expect(await workspace.statusOf()).toBe(true);
    });

    it('writes connections, folders and messages the document describes', async () => {
        const plan = await workspace.firstImport();
        const sourceId = plan.identity?.sourceId;

        const connections = await listConnections(workspace.root, 'pasarela');

        expect(connections.connections).toHaveLength(1);
        expect(connections.connections[0]).toMatchObject({
            name: 'produccion',
            transport: 'websocket',
            url: 'wss://pasarela.ejemplo.com:443/v1',
            origin: { kind: 'asyncapi', sourceId },
        });

        const tree = await readCollectionTree(workspace.root, 'pasarela');
        const [pasarela] = tree.nodes;

        expect(tree.nodes).toHaveLength(1);
        expect(pasarela).toMatchObject({ kind: 'collection', name: 'Pasarela' });

        const folders = tree.nodes.flatMap((node) => (node.kind === 'item' ? [] : node.children));

        expect(folders.map((folder) => folder.name)).toEqual(['recibos', 'avisos']);

        const leaves = folders.flatMap((node) => (node.kind === 'item' ? [node] : node.children));

        expect(leaves[0]).toMatchObject({ kind: 'item', name: 'recibos/salientes' });
    });

    it('answers with how many resources entered', async () => {
        const built = await workspace.plan(readPasarela());

        if (!built.ok) {
            throw new Error('the fixture should build a plan');
        }

        const applied = await workspace.apply(built.value.name, built.value.plan);

        expect(applied).toEqual({ ok: true, value: { applied: 6, workspaceId: 'pasarela' } });
    });

    it('writes nothing besides what the user marked: no report doc is left behind', async () => {
        await workspace.firstImport();

        expect(await listDocs(workspace.root, 'pasarela')).toEqual([]);
    });

    it('leaves an imported item the user edited out of the next import', async () => {
        await workspace.firstImport();

        const { readItem, writeItem } = await import('@mandor/store-fs');
        const tree = await readCollectionTree(workspace.root, 'pasarela');
        const folders = tree.nodes.flatMap((node) => (node.kind === 'item' ? [] : node.children));
        const leaf = folders.flatMap((node) => (node.kind === 'item' ? [node] : node.children))[0];
        const path = leaf?.path ?? '';
        const item = await readItem(workspace.root, 'pasarela', path);

        await writeItem(workspace.root, 'pasarela', path, {
            ...item,
            body: { ...item.body, payload: 'lo que el usuario escribio' },
        });

        const built = await workspace.plan(readPasarela());

        if (!built.ok) {
            throw new Error('the fixture should build a plan');
        }

        const edited = built.value.plan.entries.find((entry) => entry.name === 'recibos/salientes');

        expect(edited?.class).toBe('update');
        expect(edited?.selected).toBe(false);
    });

    it('imports the same document twice without creating anything twice', async () => {
        await workspace.firstImport();

        const connectionsBefore = await listConnections(workspace.root, 'pasarela');
        const treeBefore = await readCollectionTree(workspace.root, 'pasarela');
        const built = await workspace.plan(readPasarela());

        if (!built.ok) {
            throw new Error('the fixture should build a plan');
        }

        expect(built.value.plan.entries.every((entry) => entry.class !== 'add')).toBe(true);

        const applied = await workspace.apply(built.value.name, built.value.plan);

        if (!applied.ok) {
            throw new Error('the second import should apply');
        }

        const connectionsAfter = await listConnections(workspace.root, 'pasarela');
        const treeAfter = await readCollectionTree(workspace.root, 'pasarela');

        expect(connectionsAfter.connections).toHaveLength(connectionsBefore.connections.length);
        expect(treeAfter.nodes).toHaveLength(treeBefore.nodes.length);
    });

    it('leaves a conflict untouched instead of writing over it', async () => {
        const { createConnection } = await import('@mandor/store-fs');

        await createConnection(workspace.root, 'pasarela', {
            id: 'produccion',
            name: 'produccion',
            url: 'wss://otra.example/v1',
        });

        const built = await workspace.plan(readPasarela());

        if (!built.ok) {
            throw new Error('the fixture should build a plan');
        }

        expect(built.value.plan.entries.find((entry) => entry.place === 'connection')?.class).toBe(
            'conflict',
        );

        const applied = await workspace.apply(built.value.name, built.value.plan);

        if (!applied.ok) {
            throw new Error('the import should apply');
        }

        const connections = await listConnections(workspace.root, 'pasarela');
        const untouched = connections.connections.find(
            (connection) => connection.name === 'produccion',
        );

        expect(untouched?.url).toBe('wss://otra.example/v1');
        expect(applied.value.applied).toBe(5);
    });

    it('refuses a payload that is not a plan', async () => {
        expect((await refuse()).ok).toBe(false);
    });
});
