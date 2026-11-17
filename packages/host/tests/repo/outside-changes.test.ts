import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { ChangedEntity } from '@mandor/schema';
import type { DiskChange } from '@mandor/store-fs';
import { describe, expect, it } from 'vitest';

import { flushCommits } from '../../src/repo/commit-scheduler.js';
import { rememberText } from '../../src/repo/known-texts.js';
import { followOutsideChanges } from '../../src/repo/outside-changes.js';
import { writeInRepo } from '../../src/repo/write-in-repo.js';
import { tempRepo } from './support/temp-repo.js';

const repo = tempRepo();

const FILE = 'workspaces/pagos/workspace.yaml';
const ENTITY: ChangedEntity = { area: 'workspace', workspaceId: 'pagos' };

async function follow(changes: DiskChange[]): Promise<ChangedEntity[][]> {
    const pushes: ChangedEntity[][] = [];

    await followOutsideChanges(repo.root(), changes, (entities) => pushes.push(entities));

    return pushes;
}

async function seed(text: string): Promise<void> {
    await mkdir(join(repo.root(), 'workspaces', 'pagos'), { recursive: true });
    await repo.write(FILE, text);
}

describe('following what changed on disk without the app', () => {
    it('commits a file written by hand and tells the window which entity it is', async () => {
        await seed('name: Pagos\n');
        rememberText(repo.root(), FILE, 'name: Otro\n');

        const pushes = await follow([{ kind: 'changed', path: FILE }]);

        await flushCommits(repo.root());

        expect(pushes).toEqual([[ENTITY]]);
        expect(await repo.subjects()).toEqual([`update ${FILE}`, 'init repo']);
    });

    it('calls a file nobody read, and that exists, a change from outside', async () => {
        await seed('name: Pagos\n');

        expect(await follow([{ kind: 'changed', path: FILE }])).toEqual([[ENTITY]]);
    });

    it('stays quiet about a file that says what the window was told', async () => {
        await seed('name: Pagos\n');
        rememberText(repo.root(), FILE, 'name: Pagos\n');

        expect(await follow([{ kind: 'changed', path: FILE }])).toEqual([]);
        expect(await repo.subjects()).toEqual(['init repo']);
    });

    it('stays quiet about a file that is not there and nobody read', async () => {
        expect(await follow([{ kind: 'removed', path: FILE }])).toEqual([]);
    });

    it('tells the window about a file removed that it believed was there', async () => {
        rememberText(repo.root(), FILE, 'name: Pagos\n');

        expect(await follow([{ kind: 'removed', path: FILE }])).toEqual([[ENTITY]]);
    });

    it('judges both ends of a move and tells each entity once', async () => {
        const to = 'workspaces/pagos/environments/prod.yaml';

        await seed('name: Pagos\n');
        rememberText(repo.root(), FILE, 'name: Otro\n');
        await mkdir(join(repo.root(), 'workspaces', 'pagos', 'environments'));
        await repo.write(to, 'name: Prod\n');

        const pushes = await follow([
            { kind: 'moved', from: FILE, to },
            { kind: 'changed', path: FILE },
        ]);

        expect(pushes).toEqual([
            [ENTITY, { area: 'environment', workspaceId: 'pagos', id: 'prod' }],
        ]);
    });

    it('commits but does not tell the window about a path outside the shape of a repo', async () => {
        await repo.write('notes.txt', 'hola\n');

        const pushes = await follow([{ kind: 'changed', path: 'notes.txt' }]);

        await flushCommits(repo.root());

        expect(pushes).toEqual([]);
        expect(await repo.subjects()).toEqual(['update notes.txt', 'init repo']);
    });

    it('leaves a folder alone: its files report themselves', async () => {
        await mkdir(join(repo.root(), 'workspaces', 'pagos'), { recursive: true });

        expect(await follow([{ kind: 'changed', path: 'workspaces/pagos' }])).toEqual([]);
    });

    it('keeps the name of an edit of the app that is still waiting for its calm', async () => {
        await writeInRepo(
            {
                root: repo.root(),
                path: FILE,
                change: { kind: 'rename-workspace', name: 'pagos' },
            },
            () => seed('name: Pagos\n'),
        );

        await follow([{ kind: 'changed', path: FILE }]);
        await flushCommits(repo.root());

        expect(await repo.subjects()).toEqual(['rename workspace pagos', 'init repo']);
    });
});
