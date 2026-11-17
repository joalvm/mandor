import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { fingerprintOf } from '@mandor/interop-core';
import type { ImportedScript } from '@mandor/schema';
import {
    createCollection,
    createCollectionFolder,
    createWorkspace,
    fileExists,
    folderFile,
    writeRepoTree,
    readFolderSettings,
} from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { writeFolderEntry } from '../../src/import/write-folder-entry.js';
import { folderEntry, ORIGIN } from './support/folder-entry.js';

let root: string;

const WORKSPACE = 'mi-workspace';
const SCRIPT: ImportedScript = { event: 'onBeforeRequest', dialect: 'postman', source: 'a()' };

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-folder-entry-'));

    await writeRepoTree(root, 'Repo');
    await createWorkspace(root, { id: 'mi-workspace', name: 'Mi workspace', kind: 'sync' });
    await createCollection(root, WORKSPACE, { id: 'demo', name: 'Demo' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('writing a folder entry', () => {
    it('creates a nested folder under its parent and not in the root', async () => {
        await writeFolderEntry(root, WORKSPACE, folderEntry('demo/users', 'Users'));
        await writeFolderEntry(root, WORKSPACE, folderEntry('demo/users/admin', 'Admin'));

        expect((await readFolderSettings(root, WORKSPACE, 'demo/users/admin')).name).toBe('Admin');
        expect(await fileExists(folderFile(root, WORKSPACE, 'users/admin'))).toBe(false);
        expect((await readFolderSettings(root, WORKSPACE, 'demo/users')).order).toEqual(['admin']);
    });

    it('takes the id the plan chose when a folder of the same name exists', async () => {
        await createCollectionFolder(root, WORKSPACE, 'demo', { id: 'pets', name: 'Pets' });
        await writeFolderEntry(root, WORKSPACE, folderEntry('demo/k3m9x2q7a4bd', 'Pets'));

        expect((await readFolderSettings(root, WORKSPACE, 'demo/k3m9x2q7a4bd')).name).toBe('Pets');
    });

    it('writes the auth of an import with its origin and replaces it on a re-import', async () => {
        const first = { auth: { type: 'bearer', token: '{{a}}' } };
        const second = { auth: { type: 'bearer', token: '{{b}}' } };

        await writeFolderEntry(root, WORKSPACE, folderEntry('demo/users', 'Users', first));
        await writeFolderEntry(root, WORKSPACE, folderEntry('demo/users', 'Users', second));

        const folder = await readFolderSettings(root, WORKSPACE, 'demo/users');

        expect(folder.auth).toEqual(second.auth);
        expect(folder.importOrigin).toMatchObject(ORIGIN);
    });

    it('takes away what an earlier import wrote when the new one brings nothing', async () => {
        await writeFolderEntry(
            root,
            WORKSPACE,
            folderEntry('demo/users', 'Users', { auth: { type: 'bearer', token: '{{a}}' } }),
        );
        await writeFolderEntry(root, WORKSPACE, folderEntry('demo/users', 'Users'));

        const folder = await readFolderSettings(root, WORKSPACE, 'demo/users');

        expect(folder.auth).toBeUndefined();
        expect(folder.importOrigin).toBeUndefined();
    });

    it('reads inherit as no auth at all', async () => {
        await writeFolderEntry(
            root,
            WORKSPACE,
            folderEntry('demo/users', 'Users', { auth: { inherit: true } }),
        );

        expect((await readFolderSettings(root, WORKSPACE, 'demo/users')).auth).toBeUndefined();
    });

    it('recognizes its own scripts on a second import of a folder with no auth', async () => {
        const fields = { importedScripts: [SCRIPT] };

        await writeFolderEntry(root, WORKSPACE, folderEntry('demo/users', 'Users', fields));
        await writeFolderEntry(root, WORKSPACE, folderEntry('demo/users', 'Users', fields));

        expect((await readFolderSettings(root, WORKSPACE, 'demo/users')).importedScripts).toEqual([
            SCRIPT,
        ]);
    });

    it('stores the fingerprint of what it wrote', async () => {
        await writeFolderEntry(
            root,
            WORKSPACE,
            folderEntry('demo/users', 'Users', { importedScripts: [SCRIPT] }),
        );

        expect(
            (await readFolderSettings(root, WORKSPACE, 'demo/users')).importOrigin?.fingerprint,
        ).toBe(fingerprintOf({ importedScripts: [SCRIPT] }));
    });
});
