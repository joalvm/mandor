import type * as Fs from 'node:fs';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { writeRepoTree, watchRepo, type RepoWatcher } from '../../src/index.js';

/** Every directory the watcher asked the system to watch, and whether it asked for its subtree. */
const asked = vi.hoisted(() => [] as { path: string; recursive: boolean }[]);

vi.mock('node:fs', async (original) => {
    const fs = await original<typeof Fs>();

    return {
        ...fs,
        watch: (path: string, options: { recursive?: boolean; encoding: 'utf8' }) => {
            asked.push({ path, recursive: options.recursive === true });

            return fs.watch(path, options);
        },
    };
});

let root: string;
let watcher: RepoWatcher;

beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), 'mandor-')));
    asked.length = 0;

    await writeRepoTree(root, 'Mi repo');

    watcher = watchRepo(root, () => undefined);
});

afterEach(async () => {
    watcher.dispose();
    await rm(root, { recursive: true, force: true });
});

describe('what the repo watcher watches (watch-repo)', () => {
    /**
     * Where the system has no recursive watch of its own (Linux), Node walks the subtree and
     * keeps every file of it in memory: under the root that is all of git and of the private
     * directory, which grow with every commit and every send and are never reported.
     */
    it('watches the subtree of the workspaces only, and the root without its subtree', () => {
        expect(asked).toEqual([
            { path: root, recursive: false },
            { path: join(root, 'workspaces'), recursive: true },
        ]);
    });
});
