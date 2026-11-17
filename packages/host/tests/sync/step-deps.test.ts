import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ChangedEntity } from '@mandor/schema';
import { writeConflict } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { forgetTexts, knownText } from '../../src/repo/known-texts.js';
import { stepDepsOf } from '../../src/sync/step-deps.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-deps-'));
});

afterEach(async () => {
    forgetTexts(root);
    await rm(root, { force: true, recursive: true });
});

function depsOf(pushed: ChangedEntity[][] = []): ReturnType<typeof stepDepsOf> {
    return stepDepsOf(
        { root },
        () => Promise.resolve({ url: 'file:///remote.git' }),
        (entities) => pushed.push(entities),
    );
}

describe('what a step uses in the app', () => {
    it('reaches the remote as the access it was given says', async () => {
        await expect(depsOf().access()).resolves.toEqual({ url: 'file:///remote.git' });
    });

    it('sees no clash while the repo keeps none', async () => {
        await expect(depsOf().hasConflicts()).resolves.toBe(false);
    });

    it('sees a clash once one is kept for a person', async () => {
        await writeConflict(root, {
            path: 'workspaces/pagos/workspace.yaml',
            source: 'merge',
            base: 'a: 1\n',
            theirs: 'a: 2\n',
            at: '2026-10-07T10:00:00.000Z',
        });

        await expect(depsOf().hasConflicts()).resolves.toBe(true);
    });

    it('takes the files a move forward changed as what the window believes, and tells the window', async () => {
        const pushed: ChangedEntity[][] = [];

        await mkdir(join(root, 'workspaces', 'pagos'), { recursive: true });
        await writeFile(join(root, 'workspaces', 'pagos', 'workspace.yaml'), 'name: Pagos\n');

        await depsOf(pushed).followed(['workspaces/pagos/workspace.yaml']);

        expect(knownText(root, 'workspaces/pagos/workspace.yaml')).toBe('name: Pagos\n');
        expect(pushed).toEqual([[{ area: 'workspace', workspaceId: 'pagos' }]]);
    });

    it('says nothing of paths that are no part of the shape of a repo', async () => {
        const pushed: ChangedEntity[][] = [];

        await writeFile(join(root, 'notes.txt'), 'hola\n');
        await depsOf(pushed).followed(['notes.txt']);

        expect(pushed).toEqual([]);
    });
});
