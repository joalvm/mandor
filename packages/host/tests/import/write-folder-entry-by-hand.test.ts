import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    createCollection,
    createCollectionFolder,
    createWorkspace,
    folderFile,
    writeRepoTree,
    readFolderSettings,
    writeFolderSettings,
} from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FolderImportTakenError } from '../../src/import/folder-import-taken-error.js';
import { writeFolderEntry } from '../../src/import/write-folder-entry.js';
import { folderEntry } from './support/folder-entry.js';

let root: string;

const WORKSPACE = 'mi-workspace';

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-folder-entry-hand-'));

    await writeRepoTree(root, 'Repo');
    await createWorkspace(root, { id: 'mi-workspace', name: 'Mi workspace', kind: 'sync' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

async function writeByHand(): Promise<void> {
    await createCollection(root, WORKSPACE, { id: 'demo', name: 'Demo' });
    await createCollectionFolder(root, WORKSPACE, 'demo', { id: 'users', name: 'Users' });
    await writeFolderSettings(root, WORKSPACE, 'demo/users', {
        name: 'Users',
        order: [],
        auth: { type: 'bearer', token: '{{mine}}' },
    });
}

describe('writing a folder entry over what a person set', () => {
    it('refuses to overwrite an auth set by hand and leaves the file as it was', async () => {
        await writeByHand();

        const before = await readFile(folderFile(root, WORKSPACE, 'demo/users'), 'utf8');

        await expect(
            writeFolderEntry(
                root,
                WORKSPACE,
                folderEntry('demo/users', 'Users', {
                    auth: { type: 'bearer', token: '{{theirs}}' },
                }),
            ),
        ).rejects.toBeInstanceOf(FolderImportTakenError);
        expect(await readFile(folderFile(root, WORKSPACE, 'demo/users'), 'utf8')).toBe(before);
    });

    it('changes only the name of a folder set by hand when the import brings no auth', async () => {
        await writeByHand();
        await writeFolderEntry(root, WORKSPACE, folderEntry('demo/users', 'People'));

        expect(await readFolderSettings(root, WORKSPACE, 'demo/users')).toMatchObject({
            name: 'People',
            auth: { type: 'bearer', token: '{{mine}}' },
        });
    });

    it('refuses an imported auth that somebody edited by hand since', async () => {
        await writeFolderEntry(
            root,
            WORKSPACE,
            folderEntry('demo/users', 'Users', { auth: { type: 'bearer', token: '{{a}}' } }),
        );

        const imported = await readFolderSettings(root, WORKSPACE, 'demo/users');

        await writeFolderSettings(root, WORKSPACE, 'demo/users', {
            ...imported,
            auth: { type: 'bearer', token: '{{edited}}' },
        });

        await expect(
            writeFolderEntry(
                root,
                WORKSPACE,
                folderEntry('demo/users', 'Users', { auth: { type: 'bearer', token: '{{b}}' } }),
            ),
        ).rejects.toBeInstanceOf(FolderImportTakenError);
    });
});
