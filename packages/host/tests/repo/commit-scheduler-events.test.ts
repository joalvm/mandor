import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import { onCommitFailed, onCommitted } from '../../src/repo/commit-events.js';
import { flushCommits, scheduleCommit } from '../../src/repo/commit-scheduler.js';
import { LONG_CALM as LONG, plainFolder, tempRepo } from './support/temp-repo.js';

const repo = tempRepo();
const exec = promisify(execFile);

function schedule(root: string, key: string): void {
    scheduleCommit(
        { root, key, paths: ['a.yaml'], change: { kind: 'update-item', name: 'a' } },
        LONG,
    );
}

describe('telling the world a commit landed', () => {
    it('names the repo that committed', async () => {
        const heard: string[] = [];
        const stop = onCommitted((root) => heard.push(root));

        await repo.write('a.yaml', 'one\n');
        schedule(repo.root(), 'a.yaml');
        await flushCommits(repo.root());
        stop();

        expect(heard).toEqual([repo.root()]);
    });

    it('stays quiet when the write changed nothing', async () => {
        const heard: string[] = [];
        const stop = onCommitted((root) => heard.push(root));

        schedule(repo.root(), 'a.yaml');
        await flushCommits(repo.root());
        stop();

        expect(heard).toEqual([]);
    });

    it('stops telling the one who stopped listening', async () => {
        const heard: string[] = [];

        onCommitted((root) => heard.push(root))();

        await repo.write('a.yaml', 'one\n');
        schedule(repo.root(), 'a.yaml');
        await flushCommits(repo.root());

        expect(heard).toEqual([]);
    });
});

describe('a commit that failed', () => {
    it('is reported to whoever listens', async () => {
        const failures: string[] = [];
        const stop = onCommitFailed((root) => failures.push(root));
        const folder = await plainFolder(repo);

        scheduleCommit(
            {
                root: folder,
                key: 'a.yaml',
                paths: ['a.yaml'],
                change: { kind: 'update-item', name: 'a' },
            },
            LONG,
        );
        await flushCommits(folder);
        stop();

        expect(failures).toEqual([folder]);
    });

    /** The paths go back to their key: the next flush is another try, not a lost edit. */
    it('lands at the next flush once git can take it', async () => {
        const folder = await plainFolder(repo);
        const stop = onCommitFailed(() => undefined);

        scheduleCommit(
            {
                root: folder,
                key: 'a.yaml',
                paths: ['a.yaml'],
                change: { kind: 'update-item', name: 'a' },
            },
            LONG,
        );
        await flushCommits(folder);
        stop();
        await exec('git', ['init', '-q', folder]);
        await flushCommits(folder);

        const { stdout } = await exec('git', ['log', '--pretty=%s'], { cwd: folder });

        expect(stdout.trim()).toBe('update item a');
    });
});
