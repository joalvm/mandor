import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { writeAuth } from '../../src/auth/write-auth.js';
import { createWorkspace, writeRepoTree } from '../../src/index.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, { id: 'api-de-pagos', name: 'API de pagos', kind: 'sync' });

    await writeFile(
        workspaceFile(),
        '# the workspace of the payments\nname: API de pagos\nkind: sync\nid: api-de-pagos\n',
        'utf8',
    );
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

function workspaceFile(): string {
    return join(root, 'workspaces', 'api-de-pagos', 'workspace.yaml');
}

describe('writeAuth', () => {
    it('writes the auth of the workspace and keeps the comments of the file', async () => {
        await writeAuth(root, 'api-de-pagos', { inherit: true });

        const written = await readFile(workspaceFile(), 'utf8');

        expect(written).toContain('# the workspace of the payments');
        expect(written).toContain('inherit: true');
    });

    it('takes the key out when the level goes back to inheriting', async () => {
        await writeAuth(root, 'api-de-pagos', { type: 'bearer', token: 't' });
        await writeAuth(root, 'api-de-pagos', null);

        const written = await readFile(workspaceFile(), 'utf8');

        expect(written).not.toContain('auth');
        expect(written).toContain('# the workspace of the payments');
    });

    it('refuses to start a workspace file that is not there', async () => {
        await rm(workspaceFile());

        await expect(writeAuth(root, 'api-de-pagos', { inherit: true })).rejects.toThrow();
    });

    it('refuses a workspace file it cannot read instead of truncating it', async () => {
        await writeFile(workspaceFile(), '{{{', 'utf8');

        await expect(writeAuth(root, 'api-de-pagos', { inherit: true })).rejects.toThrow();
    });
});
