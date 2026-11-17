import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { run } from '../../src/git/run.js';
import { status } from '../../src/repo/status.js';
import { withFixedIdentity } from '../support/git-environment.js';
import { initializedRepos, removeRepo, type Repo } from '../support/repo.js';

const initialized = initializedRepos();

let repo: Repo;
let root: string;

beforeEach(async () => {
    repo = await initialized();
    root = repo.root;

    withFixedIdentity();
});

afterEach(async () => {
    await removeRepo(repo);
});

describe('reading the status of a repo', () => {
    it('reports a repo with nothing pending as clean', async () => {
        expect(await status(root)).toEqual({
            clean: true,
            staged: [],
            unstaged: [],
            untracked: [],
        });
    });

    it('sees a file git has never heard of as untracked', async () => {
        await writeFile(join(root, 'mandor.yaml'), 'name: Mi repo\n', 'utf8');

        const state = await status(root);

        expect(state).toMatchObject({ clean: false, untracked: ['mandor.yaml'], staged: [] });
    });

    it('sees a file added to the index as staged', async () => {
        await writeFile(join(root, 'mandor.yaml'), 'name: Mi repo\n', 'utf8');
        await run(['add', '-A', '--', '.'], root);

        expect(await status(root)).toMatchObject({ staged: ['mandor.yaml'], untracked: [] });
    });

    it('sees an edit to a committed file as unstaged', async () => {
        await writeFile(join(root, '.gitattributes'), '* text=auto eol=lf\n# nota\n', 'utf8');

        expect(await status(root)).toMatchObject({ unstaged: ['.gitattributes'], staged: [] });
    });

    /** The repo travels between platforms; a path with backslashes does not compare. */
    it('reports paths with forward slashes', async () => {
        await mkdir(join(root, 'workspaces', 'api-pagos'), { recursive: true });
        await writeFile(join(root, 'workspaces', 'api-pagos', 'workspace.yaml'), 'a: 1\n', 'utf8');

        expect((await status(root)).untracked).toEqual(['workspaces/api-pagos/workspace.yaml']);
    });

    /** git reports a rename as the new path followed by the old one. Only the new one moved. */
    it('reports a renamed file once, under its new path', async () => {
        await writeFile(join(root, 'mandor.yaml'), 'name: Mi repo\n', 'utf8');
        await run(['add', '-A', '--', '.'], root);
        await run(['commit', '-m', 'add repo file'], root);
        await run(['mv', 'mandor.yaml', 'repo.yaml'], root);

        expect((await status(root)).staged).toEqual(['repo.yaml']);
    });
});
