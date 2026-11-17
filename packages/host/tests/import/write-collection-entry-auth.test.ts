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

import { existingResourcesOf } from '../../src/import/import-existing.js';
import { writeCollectionEntry } from '../../src/import/write-collection-entry.js';
import { collectionEntry } from './support/collection-entry.js';

let root: string;

const WORKSPACE = 'mi-workspace';
const THEIRS = { type: 'bearer', token: '{{theirs}}' } as const;
const IMPORTED = { type: 'bearer', token: '{{imported}}' } as const;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-collection-entry-auth-'));

    await writeRepoTree(root, 'Repo');
    await createWorkspace(root, { id: WORKSPACE, name: 'Mi workspace', kind: 'sync' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('writing a collection entry that carries an auth', () => {
    it('writes the auth of the collection into its file', async () => {
        await writeCollectionEntry(
            root,
            WORKSPACE,
            collectionEntry('demo', 'Demo', { auth: IMPORTED }),
        );

        const collection = await readFolderSettings(root, WORKSPACE, 'demo');

        expect(collection.auth).toEqual(IMPORTED);
    });

    it('writes no auth for a collection that brings none', async () => {
        await writeCollectionEntry(root, WORKSPACE, collectionEntry('demo', 'Demo'));

        const collection = await readFolderSettings(root, WORKSPACE, 'demo');

        expect(collection.auth).toBeUndefined();
    });

    it('treats `inherit`, the default of a collection, as no auth', async () => {
        await writeCollectionEntry(
            root,
            WORKSPACE,
            collectionEntry('demo', 'Demo', { auth: { inherit: true } }),
        );

        const collection = await readFolderSettings(root, WORKSPACE, 'demo');

        expect(collection.auth).toBeUndefined();
    });

    it('claims the collection with a fingerprint that covers the auth', async () => {
        await writeCollectionEntry(
            root,
            WORKSPACE,
            collectionEntry('a', 'Demo', { auth: IMPORTED }),
        );
        await writeCollectionEntry(root, WORKSPACE, collectionEntry('b', 'Demo', { auth: THEIRS }));

        const first = await readFolderSettings(root, WORKSPACE, 'a');
        const second = await readFolderSettings(root, WORKSPACE, 'b');

        expect(first.importOrigin?.fingerprint).not.toBe(second.importOrigin?.fingerprint);
    });

    it('refreshes the auth when the import imports the same collection again', async () => {
        await writeCollectionEntry(
            root,
            WORKSPACE,
            collectionEntry('demo', 'Demo', { auth: IMPORTED }),
        );
        await writeCollectionEntry(
            root,
            WORKSPACE,
            collectionEntry('demo', 'Demo', { auth: THEIRS }),
        );

        const collection = await readFolderSettings(root, WORKSPACE, 'demo');

        expect(collection.auth).toEqual(THEIRS);
    });

    it('takes the auth out when the document no longer asks for one', async () => {
        await writeCollectionEntry(
            root,
            WORKSPACE,
            collectionEntry('demo', 'Demo', { auth: IMPORTED }),
        );
        await writeCollectionEntry(root, WORKSPACE, collectionEntry('demo', 'Demo'));

        const collection = await readFolderSettings(root, WORKSPACE, 'demo');

        expect(collection.auth).toBeUndefined();
    });

    it('keeps the auth a person edited after the import, and still refreshes the name', async () => {
        await writeCollectionEntry(
            root,
            WORKSPACE,
            collectionEntry('demo', 'Demo', { auth: IMPORTED }),
        );

        const written = await readFolderSettings(root, WORKSPACE, 'demo');

        await writeFolderSettings(root, WORKSPACE, 'demo', { ...written, auth: THEIRS });
        await writeCollectionEntry(
            root,
            WORKSPACE,
            collectionEntry('demo', 'Demo 2', { auth: IMPORTED }),
        );

        const collection = await readFolderSettings(root, WORKSPACE, 'demo');

        expect(collection).toMatchObject({ name: 'Demo 2', auth: THEIRS });
    });

    it('reads back a collection with the fingerprint it was claimed with, until the auth is edited', async () => {
        await writeCollectionEntry(
            root,
            WORKSPACE,
            collectionEntry('demo', 'Demo', { auth: IMPORTED }),
        );

        const [untouched] = await existingResourcesOf(root, WORKSPACE);

        expect(untouched?.fingerprint).toBe(untouched?.origin?.fingerprint);

        const written = await readFolderSettings(root, WORKSPACE, 'demo');

        await writeFolderSettings(root, WORKSPACE, 'demo', { ...written, auth: THEIRS });

        const [edited] = await existingResourcesOf(root, WORKSPACE);

        expect(edited?.fingerprint).not.toBe(edited?.origin?.fingerprint);
    });
});
