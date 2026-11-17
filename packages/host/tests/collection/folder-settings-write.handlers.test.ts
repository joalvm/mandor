import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CHANNELS } from '@mandor/ipc';
import { createWorkspace, listConflicts, writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerFolderSettingsHandlers } from '../../src/collection/folder-settings.handlers.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { flushAllCommits } from '../../src/repo/commit-scheduler.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';
import { tempRepo } from '../repo/support/temp-repo.js';

const repo = tempRepo();
const HOST = { name: 'host', value: 'api.local', enabled: true, secret: false };
const FILE = 'workspaces/pagos/collections/api/altas/folder.yaml';

let ipc: IpcSpy;
let dispose: () => void;

function onDisk(): Promise<string> {
    return readFile(join(repo.root(), FILE), 'utf8');
}

beforeEach(async () => {
    ipc = spyIpc();
    dispose = registerFolderSettingsHandlers(ipc);

    await writeRepoTree(repo.root(), 'Demo');
    await createWorkspace(repo.root(), { id: 'pagos', name: 'Pagos', kind: 'sync' });
    await mkdir(join(repo.root(), FILE, '..'), { recursive: true });
    await writeFile(
        join(repo.root(), FILE),
        '# a mano\nname: Altas\nimportedScripts:\n  - event: onResponse\n    dialect: postman\n    source: pm.test()\nfuture: kept\n',
        'utf8',
    );
    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root: repo.root() });
    // The window reads the chain before it writes: that is the base a write merges against.
    await ipc.call(CHANNELS.collectionChain, { workspaceId: 'pagos', parentPath: 'api/altas' });
});

afterEach(() => {
    dispose();
    setActiveOrigin(null);
});

function write(patch: object) {
    return ipc.call(CHANNELS.collectionSettingsWrite, {
        workspaceId: 'pagos',
        path: 'api/altas',
        patch,
    });
}

describe('the write of the settings of a folder from the window', () => {
    it('writes the words and the variables, keeps the scripts and the unknown key, and commits', async () => {
        await expect(write({ description: 'Altas', variables: [HOST] })).resolves.toEqual({
            ok: true,
            value: {},
        });

        const text = await onDisk();

        expect(text).toContain('description: Altas');
        expect(text).toContain('name: host');
        expect(text).toContain('importedScripts:');
        expect(text).toContain('future: kept');
        await flushAllCommits();
        expect((await repo.subjects())[0]).toBe('update folder Altas');
    });

    it('keeps the auth and the headers of a folder when a write names only its words', async () => {
        await writeFile(
            join(repo.root(), FILE),
            'name: Altas\nauth:\n  type: bearer\n  token: "{{token}}"\nheaders:\n  - key: X-Team\n    value: a\n    enabled: true\n',
            'utf8',
        );
        await ipc.call(CHANNELS.collectionChain, { workspaceId: 'pagos', parentPath: 'api/altas' });

        await write({ description: 'Altas' });

        const text = await onDisk();

        expect(text).toContain('description: Altas');
        expect(text).toContain('type: bearer');
        expect(text).toContain('key: X-Team');
    });

    it('writes auth and headers, and takes them out when the patch empties them', async () => {
        await write({
            auth: { type: 'bearer', token: '{{token}}' },
            headers: [{ key: 'X-Team', value: 'a', enabled: true }],
        });

        expect(await onDisk()).toContain('type: bearer');
        expect(await onDisk()).toContain('key: X-Team');

        await ipc.call(CHANNELS.collectionChain, { workspaceId: 'pagos', parentPath: 'api/altas' });
        await write({ auth: null, headers: [] });

        const text = await onDisk();

        expect(text).not.toContain('auth:');
        expect(text).not.toContain('headers:');
        expect(text).toContain('future: kept');
    });

    it('takes the imported script out once the person moved it into a script of their own', async () => {
        await write({
            scripts: { onResponse: { source: 'pm.test()' } },
            importedScripts: null,
        });

        const text = await onDisk();

        expect(text).not.toContain('importedScripts:');
        expect(text).toContain('source: pm.test()');
        expect(text).toContain('# a mano');
        expect(text).toContain('future: kept');
    });

    it('merges a write over what another machine changed in another key', async () => {
        await writeFile(join(repo.root(), FILE), `${await onDisk()}color: azul\n`, 'utf8');

        await write({ description: 'Altas' });

        const text = await onDisk();

        expect(text).toContain('color: azul');
        expect(text).toContain('description: Altas');
    });

    it('keeps the record of a conflict when another machine changed the same key', async () => {
        await write({ description: 'uno' });
        await ipc.call(CHANNELS.collectionChain, { workspaceId: 'pagos', parentPath: 'api/altas' });
        await writeFile(
            join(repo.root(), FILE),
            (await onDisk()).replace('description: uno', 'description: de otra máquina'),
            'utf8',
        );

        await write({ description: 'mía' });

        expect((await listConflicts(repo.root())).conflicts).toHaveLength(1);
    });

    it('brings back no folder that is gone', async () => {
        await expect(
            ipc.call(CHANNELS.collectionSettingsWrite, {
                workspaceId: 'pagos',
                path: 'api/nadie',
                patch: { description: 'x' },
            }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'not-found' } });
    });
});
