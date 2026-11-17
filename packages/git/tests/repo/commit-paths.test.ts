import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { run } from '../../src/git/run.js';
import { commitAll } from '../../src/repo/commit-all.js';
import { commitPaths } from '../../src/repo/commit-paths.js';
import { status } from '../../src/repo/status.js';
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

function lastCommit(format: string): Promise<string> {
    return run(['log', '-1', `--pretty=${format}`], root);
}

function commitCount(): Promise<string> {
    return run(['rev-list', '--count', 'HEAD'], root);
}

function write(path: string, text: string): Promise<void> {
    return writeFile(join(root, path), text, 'utf8');
}

describe('committing only the paths a write touched', () => {
    /** The point of the pathspec: a neighbour mid-edit must not ride along under this message. */
    it('leaves out a dirty file that was not asked for', async () => {
        await write('mine.yaml', 'name: mio\n');
        await write('theirs.yaml', 'name: ajeno\n');

        const committed = await commitPaths(root, ['mine.yaml'], 'update item mine');

        expect(committed).toBe(true);
        expect((await status(root)).untracked).toEqual(['theirs.yaml']);
        expect(await run(['show', '--name-only', '--pretty=format:'], root)).toBe('mine.yaml');
    });

    it('records the message it was given', async () => {
        await write('mine.yaml', 'name: mio\n');

        await commitPaths(root, ['mine.yaml'], 'update item mine');

        expect(await lastCommit('%s')).toBe('update item mine');
    });

    it('commits a change to a file the history already holds', async () => {
        await write('mine.yaml', 'name: uno\n');
        await commitAll(root, 'create item mine');
        await write('mine.yaml', 'name: dos\n');

        expect(await commitPaths(root, ['mine.yaml'], 'update item mine')).toBe(true);
        expect((await status(root)).clean).toBe(true);
    });

    it('commits a deletion', async () => {
        await write('mine.yaml', 'name: uno\n');
        await commitAll(root, 'create item mine');
        await rm(join(root, 'mine.yaml'));

        expect(await commitPaths(root, ['mine.yaml'], 'delete item mine')).toBe(true);
        expect((await status(root)).clean).toBe(true);
    });

    it('commits a whole folder named by one path', async () => {
        await mkdir(join(root, 'folder'));
        await write('folder/one.yaml', 'name: uno\n');
        await write('folder/two.yaml', 'name: dos\n');

        await commitPaths(root, ['folder'], 'create folder folder');

        expect((await status(root)).clean).toBe(true);
    });

    /** A moved item hands over two paths and one of them is gone: git must not choke on it. */
    it('skips a path seen neither on disk nor in the history', async () => {
        await write('mine.yaml', 'name: mio\n');

        const committed = await commitPaths(root, ['never-existed.yaml', 'mine.yaml'], 'm');

        expect(committed).toBe(true);
        expect((await status(root)).clean).toBe(true);
    });

    it('commits nothing when no path survives the filter', async () => {
        const before = await commitCount();

        expect(await commitPaths(root, ['never-existed.yaml'], 'update item mine')).toBe(false);
        expect(await commitCount()).toBe(before);
    });

    /** A save that changed nothing must not leave a commit saying it did. */
    it('commits nothing when the paths did not change', async () => {
        await write('mine.yaml', 'name: uno\n');
        await commitAll(root, 'create item mine');

        const before = await commitCount();

        expect(await commitPaths(root, ['mine.yaml'], 'update item mine')).toBe(false);
        expect(await commitCount()).toBe(before);
    });

    it('reads a name that opens with a dash as a path', async () => {
        await write('-odd.yaml', 'name: raro\n');

        expect(await commitPaths(root, ['-odd.yaml'], 'update item odd')).toBe(true);
        expect((await status(root)).clean).toBe(true);
    });

    it('commits with the identity of the repo when the machine has none', async () => {
        await write('mine.yaml', 'name: mio\n');

        await commitPaths(root, ['mine.yaml'], 'update item mine');

        expect(await lastCommit('%an <%ae>')).toBe('Mandor <mandor@localhost>');
    });
});
