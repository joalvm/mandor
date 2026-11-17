import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    cookieJarFile,
    createWorkspace,
    graphqlSchemaFile,
    deleteWorkspace,
    historyDir,
    writeRepoTree,
    loadRepo,
} from '../../src/index.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('deleting a workspace', () => {
    it('removes the directory and the id from the order, and answers with what left', async () => {
        await writeRepoTree(root, 'Mi repo');
        const kept = await createWorkspace(root, { id: 'pagos', name: 'Pagos', kind: 'async' });
        const doomed = await createWorkspace(root, { id: 'ventas', name: 'Ventas', kind: 'async' });

        const removed = await deleteWorkspace(root, doomed.id);

        const loaded = await loadRepo(root);

        expect(removed).toEqual(doomed);
        expect(loaded.workspaces.map((workspace) => workspace.id)).toEqual([kept.id]);
        await expect(stat(join(root, 'workspaces', doomed.id))).rejects.toThrow();
    });

    /** The cookies of its environments go with it; those of another workspace stay. */
    it('takes the cookie jars of the workspace with it', async () => {
        await writeRepoTree(root, 'Mi repo');
        const kept = await createWorkspace(root, { id: 'pagos', name: 'Pagos', kind: 'sync' });
        const doomed = await createWorkspace(root, { id: 'ventas', name: 'Ventas', kind: 'sync' });
        const jars = [cookieJarFile(root, doomed.id, 'local'), cookieJarFile(root, kept.id, null)];

        for (const jar of jars) {
            await mkdir(dirname(jar), { recursive: true });
            await writeFile(jar, '{}', 'utf8');
        }

        await deleteWorkspace(root, doomed.id);

        await expect(stat(dirname(jars[0] ?? ''))).rejects.toThrow();
        await expect(stat(jars[1] ?? '')).resolves.toBeDefined();
    });

    /** The sends it made are the history of nothing once the workspace is gone. */
    it('takes its history with it', async () => {
        await writeRepoTree(root, 'Mi repo');
        const kept = await createWorkspace(root, { id: 'pagos', name: 'Pagos', kind: 'sync' });
        const doomed = await createWorkspace(root, { id: 'ventas', name: 'Ventas', kind: 'sync' });

        for (const id of [doomed.id, kept.id]) {
            await mkdir(historyDir(root, id), { recursive: true });
        }

        await deleteWorkspace(root, doomed.id);

        await expect(stat(historyDir(root, doomed.id))).rejects.toThrow();
        await expect(stat(historyDir(root, kept.id))).resolves.toBeDefined();
    });

    /** A schema read for its requests is a cache of nothing once the workspace is gone. */
    it('takes the schemas it read with it', async () => {
        await writeRepoTree(root, 'Mi repo');
        const kept = await createWorkspace(root, { id: 'pagos', name: 'Pagos', kind: 'sync' });
        const doomed = await createWorkspace(root, { id: 'ventas', name: 'Ventas', kind: 'sync' });
        const key = 'a'.repeat(64);
        const schemas = [
            graphqlSchemaFile(root, doomed.id, key),
            graphqlSchemaFile(root, kept.id, key),
        ];

        for (const schema of schemas) {
            await mkdir(dirname(schema), { recursive: true });
            await writeFile(schema, '{}', 'utf8');
        }

        await deleteWorkspace(root, doomed.id);

        await expect(stat(dirname(schemas[0] ?? ''))).rejects.toThrow();
        await expect(stat(schemas[1] ?? '')).resolves.toBeDefined();
    });

    it('answers with nothing when the workspace was already unreadable', async () => {
        await writeRepoTree(root, 'Mi repo');
        const created = await createWorkspace(root, { id: 'pagos', name: 'Pagos', kind: 'async' });

        await rm(join(root, 'workspaces', created.id), { recursive: true, force: true });

        expect(await deleteWorkspace(root, created.id)).toBeNull();
    });

    it('leaves the repo readable when the id is not there', async () => {
        await writeRepoTree(root, 'Mi repo');
        const created = await createWorkspace(root, { id: 'pagos', name: 'Pagos', kind: 'async' });

        await deleteWorkspace(root, 'unknown-id');

        expect((await loadRepo(root)).workspaces.map((each) => each.id)).toEqual([created.id]);
    });
});
