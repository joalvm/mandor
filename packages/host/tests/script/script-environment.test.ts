import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { initRepo } from '@mandor/git';
import { createEnvironment } from '@mandor/schema';
import {
    createWorkspace,
    readEnvironment,
    writeEnvironment,
    writeRepoTree,
} from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { environmentPath } from '../../src/environment/save-environment.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { readSecret } from '../../src/origin/secret-store.js';
import { createScriptEnvironment } from '../../src/script/script-environment.js';
import { copiedRepo } from '../support/copied-repo.js';

vi.mock('electron', async () => ({
    safeStorage: (await import('../support/safe-storage-double.js')).safeStorageDouble({
        available: () => true,
    }),
}));

const PLACE = { origin: 'local', workspaceId: 'pagos', environmentId: 'prod' };

let root: string;
let userData: string;

const freshRepo = copiedRepo(async (root) => {
    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'pagos', name: 'Pagos', kind: 'sync' });
    await writeEnvironment(
        root,
        'pagos',
        createEnvironment({
            id: 'prod',
            name: 'Prod',
            variables: [
                { name: 'token', value: 'old', enabled: true, secret: false },
                { name: 'key', value: '', enabled: true, secret: true },
            ],
        }),
    );
    await initRepo(root);
});

beforeEach(async () => {
    root = await freshRepo();
    userData = await mkdtemp(join(tmpdir(), 'mandor-user-'));
    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root });
});

afterEach(async () => {
    setActiveOrigin(null);

    await rm(root, { recursive: true, force: true });
    await rm(userData, { recursive: true, force: true });
});

function fileText(): Promise<string> {
    return readFile(join(root, environmentPath(root, 'pagos', 'prod')), 'utf8');
}

/**
 * A script that sets a variable its environment declares changes the environment, the way the
 * user would by hand: the value stays after the app closes. What it does not declare is memory.
 */
describe('the environment a script sets into', () => {
    it('writes the value of a declared name and hands back the rest', async () => {
        const environment = createScriptEnvironment(userData);
        const rest = await environment.keep(PLACE, [
            { name: 'token', value: 'first' },
            { name: 'loose', value: 'x' },
            { name: 'token', value: 'new' },
        ]);
        const written = await readEnvironment(root, 'pagos', 'prod');

        expect(rest).toEqual([{ name: 'loose', value: 'x' }]);
        expect(written.variables.find(({ name }) => name === 'token')?.value).toBe('new');
        expect(written.variables.map(({ name }) => name)).toEqual(['token', 'key']);
    });

    /** A value marked secret never reaches the remote: it goes to the keychain, not the file. */
    it('keeps the value of a secret name on this machine and out of the file', async () => {
        const environment = createScriptEnvironment(userData);

        await environment.keep(PLACE, [{ name: 'key', value: 's3cr3t' }]);

        await expect(fileText()).resolves.not.toContain('s3cr3t');
        await expect(readSecret(userData, 'local/pagos/prod/key')).resolves.toBe('s3cr3t');
    });

    it('writes nothing for a run of no environment, or of an origin not open', async () => {
        const environment = createScriptEnvironment(userData);
        const sets = [{ name: 'token', value: 'new' }];
        const before = await fileText();

        await expect(environment.keep({ ...PLACE, environmentId: null }, sets)).resolves.toEqual(
            sets,
        );
        await expect(environment.keep({ ...PLACE, origin: 'other' }, sets)).resolves.toEqual(sets);
        await expect(environment.keep({ ...PLACE, environmentId: 'gone' }, sets)).resolves.toEqual(
            sets,
        );
        await expect(fileText()).resolves.toBe(before);
    });
});
