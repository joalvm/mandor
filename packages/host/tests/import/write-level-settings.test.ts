import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    createWorkspace,
    readFolderSettings,
    writeFolderSettings,
    writeRepoTree,
} from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FolderImportTakenError } from '../../src/import/folder-import-taken-error.js';
import { existingResourcesOf } from '../../src/import/import-existing.js';
import { writeCollectionEntry } from '../../src/import/write-collection-entry.js';
import { writeFolderEntry } from '../../src/import/write-folder-entry.js';
import { collectionEntry } from './support/collection-entry.js';
import { folderEntry } from './support/folder-entry.js';

let root: string;

const WORKSPACE = 'mi-workspace';
const SETTINGS = {
    description: 'Lo suyo',
    variables: [{ name: 'a', value: '1', enabled: true, secret: false }],
    auth: { type: 'bearer', token: '{{t}}' } as const,
    headers: [{ key: 'X-A', value: '1', enabled: true }],
};

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-level-settings-'));

    await writeRepoTree(root, 'Repo');
    await createWorkspace(root, { id: WORKSPACE, name: 'Mi workspace', kind: 'sync' });
    await writeCollectionEntry(root, WORKSPACE, collectionEntry('demo', 'Demo', SETTINGS));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

async function collectionOnDisk() {
    const found = await existingResourcesOf(root, WORKSPACE);

    return found.find((resource) => resource.place === 'collection');
}

describe('writing a collection with what its document declares', () => {
    it('writes the four settings, the auth too', async () => {
        expect(await readFolderSettings(root, WORKSPACE, 'demo')).toMatchObject(SETTINGS);
    });

    it('writes the scripts it brings', async () => {
        const importedScripts = [
            { event: 'onBeforeRequest', dialect: 'postman', source: 'x()' } as const,
        ];

        await writeCollectionEntry(
            root,
            WORKSPACE,
            collectionEntry('otra', 'Otra', { importedScripts }),
        );

        expect((await readFolderSettings(root, WORKSPACE, 'otra')).importedScripts).toEqual(
            importedScripts,
        );
    });

    it('reads back as what it claimed: nobody touched it', async () => {
        const collection = await collectionOnDisk();

        expect(collection?.fingerprint).toBe(collection?.origin?.fingerprint);
    });

    it('reads as edited once a person changes a setting, and keeps it on a re-import', async () => {
        const headers = [{ key: 'X-Mia', value: '2', enabled: true }];

        await writeFolderSettings(root, WORKSPACE, 'demo', { headers });

        const collection = await collectionOnDisk();

        expect(collection?.fingerprint).not.toBe(collection?.origin?.fingerprint);

        await writeCollectionEntry(root, WORKSPACE, collectionEntry('demo', 'Demo', SETTINGS));

        expect((await readFolderSettings(root, WORKSPACE, 'demo')).headers).toEqual(headers);
    });

    it('does not take a description a person wrote before any import', async () => {
        await writeCollectionEntry(root, WORKSPACE, collectionEntry('otra', 'Otra'));
        await writeFolderSettings(root, WORKSPACE, 'otra', { description: 'Mia' });
        await writeCollectionEntry(
            root,
            WORKSPACE,
            collectionEntry('otra', 'Otra', { description: 'Suya' }),
        );

        expect((await readFolderSettings(root, WORKSPACE, 'otra')).description).toBe('Mia');
    });
});

describe('writing a folder with what its document declares', () => {
    const ENTRY = folderEntry('demo/a', 'A', SETTINGS);

    it('writes the four settings', async () => {
        await writeFolderEntry(root, WORKSPACE, ENTRY);

        expect(await readFolderSettings(root, WORKSPACE, 'demo/a')).toMatchObject(SETTINGS);
    });

    it('writes over what it wrote itself on a re-import', async () => {
        await writeFolderEntry(root, WORKSPACE, ENTRY);
        await writeFolderEntry(
            root,
            WORKSPACE,
            folderEntry('demo/a', 'A', { ...SETTINGS, description: 'Otra' }),
        );

        expect((await readFolderSettings(root, WORKSPACE, 'demo/a')).description).toBe('Otra');
    });

    it('takes a setting the document stopped declaring out of the file', async () => {
        await writeFolderEntry(root, WORKSPACE, ENTRY);
        await writeFolderEntry(
            root,
            WORKSPACE,
            folderEntry('demo/a', 'A', { description: 'Solo esto' }),
        );

        const folder = await readFolderSettings(root, WORKSPACE, 'demo/a');

        expect(folder.description).toBe('Solo esto');
        expect(folder.variables).toBeUndefined();
        expect(folder.headers).toBeUndefined();
    });

    it('refuses a re-import after a person edited the doc, and its variables stay', async () => {
        await writeFolderEntry(root, WORKSPACE, ENTRY);
        await writeFolderSettings(root, WORKSPACE, 'demo/a', { description: 'Mia' });

        await expect(
            writeFolderEntry(
                root,
                WORKSPACE,
                folderEntry('demo/a', 'A', { ...SETTINGS, variables: [] }),
            ),
        ).rejects.toBeInstanceOf(FolderImportTakenError);

        const folder = await readFolderSettings(root, WORKSPACE, 'demo/a');

        expect(folder.description).toBe('Mia');
        expect(folder.variables).toEqual(SETTINGS.variables);
    });

    it('keeps a claim that older imports wrote over only an auth', async () => {
        const auth = SETTINGS.auth;

        await writeFolderEntry(root, WORKSPACE, folderEntry('demo/b', 'B', { auth }));
        await writeFolderEntry(root, WORKSPACE, folderEntry('demo/b', 'B', SETTINGS));

        expect((await readFolderSettings(root, WORKSPACE, 'demo/b')).headers).toEqual(
            SETTINGS.headers,
        );
    });
});
