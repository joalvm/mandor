import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ensureLocalRepo } from '../../src/repo/ensure-local-repo.js';

let base: string;
let root: string;

const REQUEST = { kind: 'async', name: 'Mandor', workspaceName: 'Personal' } as const;

beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), 'mandor-local-'));
    root = join(base, 'Mandor');

    // The suite has to see the same git on every machine, whatever the developer keeps in
    // their own configuration files.
    process.env['GIT_CONFIG_GLOBAL'] = join(base, 'no-global-config');
    process.env['GIT_CONFIG_SYSTEM'] = join(base, 'no-system-config');
});

afterEach(async () => {
    await rm(base, { recursive: true, force: true });
});

function exists(path: string): Promise<boolean> {
    return stat(path).then(
        () => true,
        () => false,
    );
}

describe('the repo Mandor opens by itself', () => {
    it('lays out a repo and a workspace where there was nothing', async () => {
        const local = await ensureLocalRepo({ ...REQUEST, root });

        expect(local.repo.name).toBe('Mandor');
        expect(local.workspace.name).toBe('Personal');
        expect(local.workspace.kind).toBe('async');
        await expect(exists(join(root, 'mandor.yaml'))).resolves.toBe(true);
        await expect(exists(join(root, '.git'))).resolves.toBe(true);
    });

    /** It runs on every boot, so a second start has to read what the first one wrote. */
    it('gives back the same workspace on the next start', async () => {
        const first = await ensureLocalRepo({ ...REQUEST, root });
        const second = await ensureLocalRepo({ ...REQUEST, root });

        expect(second.workspace.id).toBe(first.workspace.id);
        expect(second.repo.name).toBe(first.repo.name);
    });

    /** A repo the user already has is theirs. Laying the tree out again would rewrite it. */
    it('keeps the name of a repo it did not create', async () => {
        await ensureLocalRepo({ ...REQUEST, name: 'Mine', root });

        const local = await ensureLocalRepo({ ...REQUEST, root });

        expect(local.repo.name).toBe('Mine');
    });

    /** One repo per app: whatever workspace the repo holds is the workspace of that app. */
    it('adopts the workspace that is there instead of adding one of its own kind', async () => {
        const first = await ensureLocalRepo({ ...REQUEST, root });
        const second = await ensureLocalRepo({ ...REQUEST, kind: 'sync', root });

        expect(second.workspace.id).toBe(first.workspace.id);
        expect(second.workspace.kind).toBe('async');
    });

    /** Mandor commits what it writes: a repo that starts dirty is a diff nobody asked for. */
    it('leaves nothing uncommitted behind it', async () => {
        await ensureLocalRepo({ ...REQUEST, root });

        const pending = await promisify(execFile)('git', ['status', '--porcelain'], { cwd: root });

        expect(pending.stdout).toBe('');
    });

    /** The workspace starts empty: no connection, no environment, no collection. */
    it('opens the workspace with nothing in it', async () => {
        const local = await ensureLocalRepo({ ...REQUEST, root });
        const file = join(root, 'workspaces', local.workspace.id, 'workspace.yaml');

        await expect(readFile(file, 'utf8')).resolves.toContain('kind: async');
        await expect(
            exists(join(root, 'workspaces', local.workspace.id, 'connections')),
        ).resolves.toBe(false);
    });

    /** A repo file that cannot be read is not an empty directory, and must not be overwritten. */
    it('refuses to lay a repo over a file it cannot read', async () => {
        await ensureLocalRepo({ ...REQUEST, root });
        await writeFile(join(root, 'mandor.yaml'), ': not yaml :\n', 'utf8');

        await expect(ensureLocalRepo({ ...REQUEST, root })).rejects.toThrow();
    });
});
