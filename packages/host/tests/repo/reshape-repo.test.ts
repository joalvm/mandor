import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { knownText } from '../../src/repo/known-texts.js';
import { onCommitted } from '../../src/repo/commit-events.js';
import { reshapeRepo } from '../../src/repo/reshape-repo.js';
import { writeInRepo } from '../../src/repo/write-in-repo.js';
import { tempRepo } from './support/temp-repo.js';

const repo = tempRepo();

describe('changing the shape of the repo', () => {
    it('commits in the act, with no calm to wait for', async () => {
        await reshapeRepo(
            {
                root: repo.root(),
                paths: ['a.yaml'],
                change: { kind: 'create-item', name: 'a' },
            },
            () => repo.write('a.yaml', 'one\n'),
        );

        expect(await repo.subjects()).toEqual(['create item a', 'init repo']);
        expect(await repo.dirty()).toBe('');
    });

    it('answers with what the work answered', async () => {
        const answer = await reshapeRepo(
            { root: repo.root(), paths: ['a.yaml'], change: { kind: 'create-item', name: 'a' } },
            async () => {
                await repo.write('a.yaml', 'one\n');

                return 'created';
            },
        );

        expect(answer).toBe('created');
    });

    /** The history reads in the order the user acted: the edit first, then the move. */
    it('leaves the commit that was waiting before its own', async () => {
        await repo.write('a.yaml', 'one\n');
        await writeInRepo(
            { root: repo.root(), path: 'a.yaml', change: { kind: 'update-item', name: 'a' } },
            () => repo.write('a.yaml', 'edited\n'),
        );

        await reshapeRepo(
            { root: repo.root(), paths: ['b.yaml'], change: { kind: 'create-item', name: 'b' } },
            () => repo.write('b.yaml', 'one\n'),
        );

        expect(await repo.subjects()).toEqual(['create item b', 'update item a', 'init repo']);
    });

    it('commits the deletion of a path the work removed', async () => {
        await reshapeRepo(
            { root: repo.root(), paths: ['a.yaml'], change: { kind: 'create-item', name: 'a' } },
            () => repo.write('a.yaml', 'one\n'),
        );
        await reshapeRepo(
            { root: repo.root(), paths: ['a.yaml'], change: { kind: 'delete-item', name: 'a' } },
            () => rm(join(repo.root(), 'a.yaml')),
        );

        expect(await repo.subjects()).toEqual(['delete item a', 'create item a', 'init repo']);
        expect(await repo.dirty()).toBe('');
    });

    it('tells the world the commit landed', async () => {
        const heard: string[] = [];
        const stop = onCommitted((root) => heard.push(root));

        await reshapeRepo(
            { root: repo.root(), paths: ['a.yaml'], change: { kind: 'create-item', name: 'a' } },
            () => repo.write('a.yaml', 'one\n'),
        );
        stop();

        expect(heard).toEqual([repo.root()]);
    });

    it('names the paths from the answer when only the work knows them', async () => {
        await reshapeRepo(
            {
                root: repo.root(),
                paths: (name: string) => [name],
                change: { kind: 'create-item', name: 'a' },
            },
            async () => {
                await repo.write('made.yaml', 'one\n');

                return 'made.yaml';
            },
        );

        expect(await repo.lastFiles()).toEqual(['made.yaml']);
        expect(await repo.dirty()).toBe('');
    });

    /**
     * Two changes can land at once: a rename while the commit of an edit runs. Git refuses the
     * second writer of `.git/index.lock` with words no user can act on; the turn keeps them apart.
     */
    it('commits two changes that arrive at once, each in its turn', async () => {
        await Promise.all([
            reshapeRepo(
                {
                    root: repo.root(),
                    paths: ['a.yaml'],
                    change: { kind: 'create-item', name: 'a' },
                },
                () => repo.write('a.yaml', 'one\n'),
            ),
            reshapeRepo(
                {
                    root: repo.root(),
                    paths: ['b.yaml'],
                    change: { kind: 'create-item', name: 'b' },
                },
                () => repo.write('b.yaml', 'one\n'),
            ),
        ]);

        expect(await repo.subjects()).toEqual(['create item b', 'create item a', 'init repo']);
        expect(await repo.dirty()).toBe('');
    });

    it('commits nothing and keeps the error when the work failed', async () => {
        const failed = reshapeRepo(
            { root: repo.root(), paths: ['a.yaml'], change: { kind: 'create-item', name: 'a' } },
            () => Promise.reject(new Error('disk refused')),
        );

        await expect(failed).rejects.toThrow('disk refused');

        expect(await repo.subjects()).toEqual(['init repo']);
    });
});

describe('what the window believes after a change of shape', () => {
    it('is what the change left on disk, so the watcher takes it for the app own work', async () => {
        await repo.write('gone.yaml', 'old\n');
        await reshapeRepo(
            { root: repo.root(), paths: ['gone.yaml'], change: { kind: 'create-item', name: 'g' } },
            () => repo.write('gone.yaml', 'old\n'),
        );
        await reshapeRepo(
            {
                root: repo.root(),
                paths: ['gone.yaml', 'new.yaml'],
                change: { kind: 'move-item', name: 'g', to: 'new' },
            },
            async () => {
                await rm(join(repo.root(), 'gone.yaml'));
                await repo.write('new.yaml', 'new\n');
            },
        );

        expect(knownText(repo.root(), 'gone.yaml')).toBeNull();
        expect(knownText(repo.root(), 'new.yaml')).toBe('new\n');
    });
});
