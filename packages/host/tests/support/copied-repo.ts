import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll } from 'vitest';

/** A fresh copy of the repo of the file: at `dest` when given, which must not exist yet. */
export type RepoCopy = (dest?: string) => Promise<string>;

/**
 * A repo laid out by `build` once for the file, and a copy of it of its own for each test.
 * Laying one out runs git a handful of times, which on a runner is most of what a test of the
 * handlers takes; copying it runs git none. Called at the top of the file, where hooks register.
 */
export function copiedRepo(build: (root: string) => Promise<void>): RepoCopy {
    let built: string | null = null;

    beforeAll(async () => {
        const root = await mkdtemp(join(tmpdir(), 'mandor-repo-'));

        await build(root);
        built = root;
    });

    afterAll(async () => {
        if (built !== null) {
            await rm(built, { recursive: true, force: true });
        }
    });

    return async (dest) => {
        if (built === null) {
            throw new Error('copiedRepo hands out copies only once its repo is built');
        }

        const root = dest ?? (await mkdtemp(join(tmpdir(), 'mandor-repo-')));

        await cp(built, root, { recursive: true });

        return root;
    };
}
