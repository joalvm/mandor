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

function base(value: string) {
    return [{ name: 'base', value, enabled: true, secret: false }];
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-collection-entry-variables-'));

    await writeRepoTree(root, 'Repo');
    await createWorkspace(root, { id: WORKSPACE, name: 'Mi workspace', kind: 'sync' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('writing a collection entry that carries variables', () => {
    it('leaves each collection of two documents with its own base', async () => {
        await writeCollectionEntry(
            root,
            WORKSPACE,
            collectionEntry('uno', 'Uno', { variables: base('1') }),
        );
        await writeCollectionEntry(
            root,
            WORKSPACE,
            collectionEntry('dos', 'Dos', { variables: base('2') }),
        );

        expect((await readFolderSettings(root, WORKSPACE, 'uno')).variables).toEqual(base('1'));
        expect((await readFolderSettings(root, WORKSPACE, 'dos')).variables).toEqual(base('2'));
    });

    it('claims the variables with the fingerprint, so the next import refreshes them', async () => {
        const entry = collectionEntry('uno', 'Uno', { variables: base('1') });

        await writeCollectionEntry(root, WORKSPACE, entry);
        await writeCollectionEntry(
            root,
            WORKSPACE,
            collectionEntry('uno', 'Uno', { variables: base('9') }),
        );

        expect((await readFolderSettings(root, WORKSPACE, 'uno')).variables).toEqual(base('9'));
    });

    it('sees a variable edited by hand as an edit, and keeps it', async () => {
        await writeCollectionEntry(
            root,
            WORKSPACE,
            collectionEntry('uno', 'Uno', { variables: base('1') }),
        );
        await writeFolderSettings(root, WORKSPACE, 'uno', { variables: base('a mano') });

        const [existing] = await existingResourcesOf(root, WORKSPACE);

        expect(existing?.fingerprint).not.toBe(existing?.origin?.fingerprint);

        await writeCollectionEntry(
            root,
            WORKSPACE,
            collectionEntry('uno', 'Uno', { variables: base('9') }),
        );

        expect((await readFolderSettings(root, WORKSPACE, 'uno')).variables).toEqual(
            base('a mano'),
        );
    });
});
