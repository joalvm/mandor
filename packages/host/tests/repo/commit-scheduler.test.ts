import type { RepoChange } from '@mandor/git';
import { describe, expect, it } from 'vitest';

import {
    cancelCommit,
    flushAllCommits,
    flushCommits,
    hasPendingCommit,
    scheduleCommit,
} from '../../src/repo/commit-scheduler.js';
import { LONG_CALM as LONG, tempRepo } from './support/temp-repo.js';

const repo = tempRepo();

/** The calm of a test: short enough to wait for by condition, long enough to share a tick. */
const CALM = 10;

function schedule(key: string, paths: string[], change: RepoChange, quietMs: number): void {
    scheduleCommit({ root: repo.root(), key, paths, change }, quietMs);
}

describe('committing an edit after the calm', () => {
    it('commits two writes of one key as one commit', async () => {
        await repo.write('a.yaml', 'one\n');
        schedule('a.yaml', ['a.yaml'], { kind: 'update-item', name: 'a' }, CALM);
        await repo.write('a.yaml', 'two\n');
        schedule('a.yaml', ['a.yaml'], { kind: 'update-item', name: 'a' }, CALM);

        await expect.poll(repo.subjects).toHaveLength(2);
        await flushCommits(repo.root());

        expect(await repo.subjects()).toEqual(['update item a', 'init repo']);
    });

    it('commits two keys as two commits, each with its own message', async () => {
        await repo.write('a.yaml', 'one\n');
        await repo.write('b.yaml', 'one\n');
        schedule('a.yaml', ['a.yaml'], { kind: 'update-item', name: 'a' }, CALM);
        schedule('b.yaml', ['b.yaml'], { kind: 'update-doc', name: 'b' }, CALM);

        await expect.poll(repo.subjects).toHaveLength(3);

        expect(new Set(await repo.subjects())).toEqual(
            new Set(['update item a', 'update doc b', 'init repo']),
        );
        expect(await repo.dirty()).toBe('');
    });

    it('keeps the message of the last write of the key', async () => {
        await repo.write('a.yaml', 'one\n');
        schedule('a', ['a.yaml'], { kind: 'create-item', name: 'a' }, LONG);
        schedule('a', ['a.yaml'], { kind: 'update-item', name: 'a' }, LONG);

        await flushCommits(repo.root());

        expect(await repo.subjects()).toEqual(['update item a', 'init repo']);
    });

    it('gathers the paths of every write of the key', async () => {
        await repo.write('a.yaml', 'one\n');
        await repo.write('b.yaml', 'one\n');
        schedule('k', ['a.yaml'], { kind: 'update-item', name: 'k' }, LONG);
        schedule('k', ['b.yaml'], { kind: 'update-item', name: 'k' }, LONG);

        await flushCommits(repo.root());

        expect((await repo.lastFiles()).sort()).toEqual(['a.yaml', 'b.yaml']);
    });
});

describe('flushing what is waiting for the calm', () => {
    it('commits at once, without waiting for the calm', async () => {
        await repo.write('a.yaml', 'one\n');
        schedule('a.yaml', ['a.yaml'], { kind: 'update-item', name: 'a' }, LONG);

        expect(await repo.subjects()).toEqual(['init repo']);

        await flushCommits(repo.root());

        expect(await repo.subjects()).toEqual(['update item a', 'init repo']);
    });

    it('flushes every repo when asked to flush all', async () => {
        await repo.write('a.yaml', 'one\n');
        schedule('a.yaml', ['a.yaml'], { kind: 'update-item', name: 'a' }, LONG);

        await flushAllCommits();

        expect(await repo.dirty()).toBe('');
    });

    it('answers when nothing is waiting', async () => {
        await expect(flushCommits(repo.root())).resolves.toBeUndefined();
    });

    it('commits nothing for a key that was cancelled', async () => {
        await repo.write('a.yaml', 'one\n');
        schedule('a.yaml', ['a.yaml'], { kind: 'update-item', name: 'a' }, LONG);

        cancelCommit(repo.root(), 'a.yaml');
        await flushCommits(repo.root());

        expect(await repo.subjects()).toEqual(['init repo']);
    });
});

describe('asking whether a key is waiting', () => {
    it('says yes while the calm lasts and no once it was committed or cancelled', async () => {
        await repo.write('a.yaml', 'one\n');
        schedule('a.yaml', ['a.yaml'], { kind: 'update-item', name: 'a' }, LONG);

        expect(hasPendingCommit(repo.root(), 'a.yaml')).toBe(true);
        expect(hasPendingCommit(repo.root(), 'b.yaml')).toBe(false);

        await flushCommits(repo.root());

        expect(hasPendingCommit(repo.root(), 'a.yaml')).toBe(false);
    });
});
