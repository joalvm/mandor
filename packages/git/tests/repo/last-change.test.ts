import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { lastChange } from '../../src/repo/last-change.js';
import { commitAll } from '../../src/repo/commit-all.js';
import { withoutIdentity } from '../support/git-environment.js';
import { initializedRepos, removeRepo, type Repo } from '../support/repo.js';

const initialized = initializedRepos();

let repo: Repo;
let root: string;

beforeEach(async () => {
    repo = await initialized();
    root = repo.root;

    withoutIdentity();
});

afterEach(async () => {
    await removeRepo(repo);
});

async function commitFile(path: string): Promise<void> {
    await mkdir(join(root, path, '..'), { recursive: true });
    await writeFile(join(root, path), 'x', 'utf8');
    await commitAll(root, `touch ${path}`);
}

describe('the last change of one path', () => {
    it('answers with the instant of the newest commit that touched the path', async () => {
        await commitFile('workspaces/pedidos/workspace.yaml');

        const when = await lastChange(root, 'workspaces/pedidos');

        expect(when).not.toBeNull();
        expect(Date.parse(when ?? '')).not.toBeNaN();
    });

    it('answers null for a path no commit touched', async () => {
        await commitFile('workspaces/pedidos/workspace.yaml');

        expect(await lastChange(root, 'workspaces/ventas')).toBeNull();
    });

    it('answers null when the history cannot answer', async () => {
        // A directory that is not a repository has no history to ask; the date column stays empty.
        const elsewhere = join(repo.base, 'not-a-repo');

        await mkdir(elsewhere);

        expect(await lastChange(elsewhere, 'workspaces/pedidos')).toBeNull();
    });
});
