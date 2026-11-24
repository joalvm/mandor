import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    collectionDefinitionFile,
    createWorkspace,
    folderDir,
    folderFile,
    readFolderSettings,
    writeRepoTree,
} from '../../src/index.js';
import { writeFolderSettings } from '../../src/collection/write-folder-settings.js';

let root: string;

const WORKSPACE = 'mi-workspace';
const ORIGIN = { kind: 'postman', sourceId: 'collections:1', fingerprint: 'abc' } as const;
const SCRIPTS = { onBeforeRequest: { source: 'mandor.test()' } };
const AUTH = { type: 'bearer', token: '{{token}}' } as const;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-folder-settings-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, { id: 'mi-workspace', name: 'Mi workspace', kind: 'sync' });
    await writeFolderSettings(root, WORKSPACE, 'api/users', { name: 'Users', order: ['get-user'] });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('writing the settings of a folder by patch', () => {
    it('writes the keys of the patch next to what the file already said', async () => {
        await writeFolderSettings(root, WORKSPACE, 'api/users', {
            name: 'People',
            auth: AUTH,
            scripts: SCRIPTS,
            importOrigin: ORIGIN,
        });

        expect(await readFolderSettings(root, WORKSPACE, 'api/users')).toMatchObject({
            name: 'People',
            order: ['get-user'],
            auth: AUTH,
            scripts: SCRIPTS,
            importOrigin: ORIGIN,
        });
    });

    it('keeps the comments of the file and the keys it does not know', async () => {
        const file = folderFile(root, WORKSPACE, 'api/users');
        const text = await readFile(file, 'utf8');

        await writeFile(file, `# kept by hand\n${text}future: kept\n`, 'utf8');

        await writeFolderSettings(root, WORKSPACE, 'api/users', { auth: AUTH });

        const written = await readFile(file, 'utf8');

        expect(written).toContain('# kept by hand');
        expect(written).toContain('future: kept');
    });

    it('takes a key out when the patch says undefined, and leaves the rest', async () => {
        await writeFolderSettings(root, WORKSPACE, 'api/users', {
            auth: AUTH,
            scripts: SCRIPTS,
            importOrigin: ORIGIN,
        });
        await writeFolderSettings(root, WORKSPACE, 'api/users', {
            auth: undefined,
            scripts: undefined,
            importOrigin: undefined,
        });

        const folder = await readFolderSettings(root, WORKSPACE, 'api/users');

        expect(folder.auth).toBeUndefined();
        expect(folder.scripts).toBeUndefined();
        expect(folder.importOrigin).toBeUndefined();
        expect(folder.order).toEqual(['get-user']);
    });

    it('writes a collection in collection.yaml, the file of its level', async () => {
        await writeFolderSettings(root, WORKSPACE, 'api', { name: 'API', description: 'Todo' });

        expect(await readFile(collectionDefinitionFile(root, WORKSPACE, 'api'), 'utf8')).toBe(
            'name: API\ndescription: Todo\n',
        );
    });

    it('names a group without a file after its directory', async () => {
        await mkdir(folderDir(root, WORKSPACE, 'api/orders'), { recursive: true });

        await writeFolderSettings(root, WORKSPACE, 'api/orders', { auth: AUTH });

        expect(await readFolderSettings(root, WORKSPACE, 'api/orders')).toMatchObject({
            name: 'orders',
            auth: AUTH,
        });
    });

    it('refuses an auth Mandor cannot hold and leaves the file as it was', async () => {
        const before = await readFile(folderFile(root, WORKSPACE, 'api/users'), 'utf8');

        await expect(
            writeFolderSettings(
                root,
                WORKSPACE,
                'api/users',
                // @ts-expect-error — an auth type nobody supports, to see it refused
                { auth: { type: 'digest' } },
            ),
        ).rejects.toThrow();
        expect(await readFile(folderFile(root, WORKSPACE, 'api/users'), 'utf8')).toBe(before);
    });

    it('refuses to write over a file nobody can read', async () => {
        const file = folderFile(root, WORKSPACE, 'api/users');

        await writeFile(file, 'name: [\n', 'utf8');

        await expect(
            writeFolderSettings(root, WORKSPACE, 'api/users', { name: 'X' }),
        ).rejects.toThrow();
        expect(await readFile(file, 'utf8')).toBe('name: [\n');
    });
});
