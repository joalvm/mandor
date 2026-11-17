import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { createEnvironment } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    cookieJarFile,
    createWorkspace,
    deleteEnvironment,
    writeRepoTree,
    listEnvironments,
    writeEnvironment,
} from '../../src/index.js';

let root: string;
let path: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
    path = join(root, 'workspaces', 'payments', 'environments', 'local.yaml');

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'payments', name: 'Payments', kind: 'async' });
    await writeEnvironment(root, 'payments', createEnvironment({ id: 'local', name: 'Local' }));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('deleting an environment', () => {
    it('removes the file and the environment from the list', async () => {
        await deleteEnvironment(root, 'payments', 'local');

        await expect(access(path)).rejects.toThrow();
        expect((await listEnvironments(root, 'payments')).environments).toEqual([]);
    });

    /** The cookies a server set for this environment are of nothing once it is gone. */
    it('takes the cookie jar of the environment with it, and no other', async () => {
        const jar = cookieJarFile(root, 'payments', 'local');
        const other = cookieJarFile(root, 'payments', null);

        await mkdir(dirname(jar), { recursive: true });
        await writeFile(jar, '{}', 'utf8');
        await writeFile(other, '{}', 'utf8');

        await deleteEnvironment(root, 'payments', 'local');

        await expect(access(jar)).rejects.toThrow();
        await expect(access(other)).resolves.toBeUndefined();
    });

    it('reports an environment that is not there', async () => {
        await expect(deleteEnvironment(root, 'payments', 'missing')).rejects.toThrow();
    });

    it('refuses an id that climbs out of the workspace', async () => {
        await expect(deleteEnvironment(root, 'payments', '../../local')).rejects.toThrow();
    });
});
