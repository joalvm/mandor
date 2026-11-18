import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { flushCommits } from '../../src/repo/commit-scheduler.js';
import { writesSettled } from '../../src/runtime/write-drain.js';
import { writeInRepo } from '../../src/repo/write-in-repo.js';
import { tempRepo } from './support/temp-repo.js';

const repo = tempRepo();

describe('editing inside the turn of the repo', () => {
    it('answers with what the work answered', async () => {
        const answer = await writeInRepo(
            { root: repo.root(), path: 'a.yaml', change: { kind: 'update-item', name: 'a' } },
            async () => {
                await repo.write('a.yaml', 'one\n');

                return 'written';
            },
        );

        expect(answer).toBe('written');
    });

    it('holds the exit until the work has landed', async () => {
        let release: () => void = () => undefined;
        const gate = new Promise<void>((open) => {
            release = open;
        });
        const writing = writeInRepo(
            { root: repo.root(), path: 'a.yaml', change: { kind: 'update-item', name: 'a' } },
            async () => {
                await gate;
                await repo.write('a.yaml', 'one\n');
            },
        );
        let settled = false;
        const settling = writesSettled().then(() => {
            settled = true;
        });

        await Promise.resolve();
        expect(settled).toBe(false);

        release();
        await writing;
        await settling;

        expect(settled).toBe(true);
    });

    /**
     * Each edit reads the file, changes it and writes it back. Two that overlap would each read
     * what was there before both, and the second would write its stale read over the first.
     */
    it('lands two edits of one file that overlap in time without losing either', async () => {
        const append = (line: string) =>
            writeInRepo(
                { root: repo.root(), path: 'a.yaml', change: { kind: 'update-item', name: 'a' } },
                async () => {
                    const read = await readFile(join(repo.root(), 'a.yaml'), 'utf8');

                    await repo.write('a.yaml', `${read}${line}\n`);
                },
            );

        await repo.write('a.yaml', 'one\n');
        await Promise.all([append('two'), append('three')]);

        expect(await readFile(join(repo.root(), 'a.yaml'), 'utf8')).toBe('one\ntwo\nthree\n');
    });

    it('leaves the commit for after the calm', async () => {
        await writeInRepo(
            { root: repo.root(), path: 'a.yaml', change: { kind: 'update-item', name: 'a' } },
            () => repo.write('a.yaml', 'one\n'),
        );

        expect(await repo.subjects()).toEqual(['init repo']);

        await flushCommits(repo.root());

        expect(await repo.subjects()).toEqual(['update item a', 'init repo']);
        expect(await repo.lastFiles()).toEqual(['a.yaml']);
    });

    it('makes one commit of two edits of one path', async () => {
        const request = {
            root: repo.root(),
            path: 'a.yaml',
            change: { kind: 'update-item', name: 'a' },
        } as const;

        await writeInRepo(request, () => repo.write('a.yaml', 'one\n'));
        await writeInRepo(request, () => repo.write('a.yaml', 'two\n'));
        await flushCommits(repo.root());

        expect(await repo.subjects()).toEqual(['update item a', 'init repo']);
    });

    it('commits a path another edit left dirty only under its own edit', async () => {
        await writeInRepo(
            { root: repo.root(), path: 'a.yaml', change: { kind: 'update-item', name: 'a' } },
            () => repo.write('a.yaml', 'one\n'),
        );
        await repo.write('b.yaml', 'outside the app\n');
        await flushCommits(repo.root());

        expect(await repo.lastFiles()).toEqual(['a.yaml']);
        expect(await repo.dirty()).toContain('b.yaml');
    });

    /** Work that failed wrote nothing worth a commit: nothing is scheduled and the error stays. */
    it('schedules nothing when the work failed', async () => {
        const failed = writeInRepo(
            { root: repo.root(), path: 'a.yaml', change: { kind: 'update-item', name: 'a' } },
            () => Promise.reject(new Error('disk refused')),
        );

        await expect(failed).rejects.toThrow('disk refused');
        await flushCommits(repo.root());

        expect(await repo.subjects()).toEqual(['init repo']);
    });
});
