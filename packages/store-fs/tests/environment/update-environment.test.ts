import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createEnvironment } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    createWorkspace,
    FileReadError,
    writeRepoTree,
    updateEnvironment,
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

describe('updating an environment', () => {
    it('returns and writes the environment with the change applied', async () => {
        const updated = await updateEnvironment({
            root,
            workspaceId: 'payments',
            environmentId: 'local',
            changes: { name: 'Development' },
        });

        expect(updated.name).toBe('Development');
        expect(await readFile(path, 'utf8')).toContain('name: Development');
    });

    it('keeps comments and unknown keys already in the file', async () => {
        const source = await readFile(path, 'utf8');

        await writeFile(path, `# local values\n${source}color: cyan\n`, 'utf8');
        await updateEnvironment({
            root,
            workspaceId: 'payments',
            environmentId: 'local',
            changes: { name: 'Development' },
        });

        const written = await readFile(path, 'utf8');

        expect(written).toContain('# local values');
        expect(written).toContain('color: cyan');
    });

    it('refuses an invalid change and leaves the file alone', async () => {
        await expect(
            updateEnvironment({
                root,
                workspaceId: 'payments',
                environmentId: 'local',
                changes: { name: '' },
            }),
        ).rejects.toThrow();
        expect(await readFile(path, 'utf8')).toContain('name: Local');
    });

    it('reports an environment that is not there', async () => {
        await expect(
            updateEnvironment({
                root,
                workspaceId: 'payments',
                environmentId: 'missing',
                changes: { name: 'Other' },
            }),
        ).rejects.toThrow(FileReadError);
    });
});

const secretToken = { name: 'TOKEN', value: 'abc123', enabled: true, secret: true };

describe('updating an environment that declares a secret', () => {
    it('leaves the value of a secret variable out of the file', async () => {
        await updateEnvironment({
            root,
            workspaceId: 'payments',
            environmentId: 'local',
            changes: { variables: [secretToken] },
            keep: () => Promise.resolve(),
        });

        await expect(readFile(path, 'utf8')).resolves.not.toContain('abc123');
    });

    /** The renderer asks for a change and gets the environment as disk holds it: no value. */
    it('gives back the environment without the value it did not write', async () => {
        const updated = await updateEnvironment({
            root,
            workspaceId: 'payments',
            environmentId: 'local',
            changes: { variables: [secretToken] },
            keep: () => Promise.resolve(),
        });

        expect(updated.variables).toEqual([
            { name: 'TOKEN', value: '', enabled: true, secret: true },
        ]);
    });

    it('does not rewrite the file when the keeper refuses the value', async () => {
        await expect(
            updateEnvironment({
                root,
                workspaceId: 'payments',
                environmentId: 'local',
                changes: { variables: [secretToken] },
                keep: () => Promise.reject(new Error('no keychain')),
            }),
        ).rejects.toThrow('no keychain');
        await expect(readFile(path, 'utf8')).resolves.not.toContain('TOKEN');
    });
});
