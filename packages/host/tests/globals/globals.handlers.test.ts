import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CHANNELS } from '@mandor/ipc';
import { writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerGlobalsHandlers } from '../../src/globals/globals.handlers.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';
import { tempRepo } from '../repo/support/temp-repo.js';

vi.mock('electron', async () => ({
    safeStorage: (await import('../support/safe-storage-double.js')).safeStorageDouble(),
}));

const repo = tempRepo();
const TOKEN = { name: 'token', value: 's3cr3t-largo', enabled: true, secret: true };
const HOST = { name: 'host', value: 'api.local', enabled: true, secret: false };

let ipc: IpcSpy;
let dispose: () => void;

beforeEach(async () => {
    const userDataDir = join(repo.root(), '..', 'user-data');

    await mkdir(userDataDir, { recursive: true });
    ipc = spyIpc();
    dispose = registerGlobalsHandlers(ipc, { userDataDir });

    await writeRepoTree(repo.root(), 'Demo');
    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root: repo.root() });
});

afterEach(() => {
    dispose();
    setActiveOrigin(null);
});

describe('the globals handlers', () => {
    it('reads an origin with no globals as an empty list', async () => {
        await expect(ipc.call(CHANNELS.globalsRead, {})).resolves.toEqual({
            ok: true,
            value: { variables: [] },
        });
    });

    it('writes the list in a commit of its own and keeps the secret value off the file', async () => {
        const answer = await ipc.call(CHANNELS.globalsWrite, {
            globals: { variables: [HOST, TOKEN] },
        });

        expect(answer).toEqual({ ok: true, value: { variables: [HOST, { ...TOKEN, value: '' }] } });
        expect(await readFile(join(repo.root(), 'globals.yaml'), 'utf8')).not.toContain('s3cr3t');
        await expect.poll(repo.subjects).toContain('update globals');
    });

    it('merges a write over what changed on disk since the window read it', async () => {
        await ipc.call(CHANNELS.globalsWrite, { globals: { variables: [HOST] } });
        await ipc.call(CHANNELS.globalsRead, {});
        await writeFile(
            join(repo.root(), 'globals.yaml'),
            `${await readFile(join(repo.root(), 'globals.yaml'), 'utf8')}  - name: region\n    value: eu\n    enabled: true\n    secret: false\n`,
            'utf8',
        );

        await ipc.call(CHANNELS.globalsWrite, {
            globals: { variables: [HOST, { ...HOST, name: 'page', value: '2' }] },
        });

        const text = await readFile(join(repo.root(), 'globals.yaml'), 'utf8');

        expect(text).toContain('name: region');
        expect(text).toContain('name: page');
    });

    it('refuses a request it cannot read', async () => {
        await expect(ipc.call(CHANNELS.globalsWrite, { globals: 'no' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});
