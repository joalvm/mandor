import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { repoSourceFiles, sourceFilesOf, type SourceFile } from '../support/source-files.js';

/** The one module allowed to spawn git. Any other is a call without the error mapping. */
const INVOKER = 'packages/git/src/git/run.ts';

const CALL = 'simpleGit';

/** The other way to reach git: a process of the system. Nothing in the app launches one. */
const SPAWN = 'child_process';

let planted: string;

beforeEach(async () => {
    planted = await mkdtemp(join(tmpdir(), 'mandor-git-'));
});

afterEach(async () => {
    await rm(planted, { recursive: true, force: true });
});

function mentioning(files: SourceFile[], text: string): string[] {
    return files.filter((file) => file.text.includes(text)).map((file) => file.path);
}

describe('invoking git', () => {
    it('happens in one module and nowhere else in any package or app', async () => {
        expect(mentioning(await repoSourceFiles(), CALL)).toEqual([INVOKER]);
    });

    it('never goes through a process of the system', async () => {
        expect(mentioning(await repoSourceFiles(), SPAWN)).toEqual([]);
    });

    /** A guard is worth having only if it sees the thing it guards against appear. */
    it('is caught when a second module starts doing it', async () => {
        await writeFile(join(planted, 'sync.ts'), "import { simpleGit } from 'simple-git';\n");
        await writeFile(
            join(planted, 'spawn.ts'),
            "import { execFile } from 'node:child_process';\n",
        );

        const files = await sourceFilesOf(planted);

        expect(mentioning(files, CALL)).toEqual(['sync.ts']);
        expect(mentioning(files, SPAWN)).toEqual(['spawn.ts']);
    });
});
