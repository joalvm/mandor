import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { repoSourceFiles, sourceFilesOf, type SourceFile } from '../support/source-files.js';

/** The arguments of a push as source spells them: an array that starts with `'push'`. */
const PUSH_ARGS = /\[\s*['"]push['"][^\]]*\]/g;

/**
 * What makes a push rewrite or remove what the origin holds. `--force-with-lease` starts with
 * `--force`, so it is caught too: it throws away commits Mandor did not write as well.
 */
const FORCING = /--force|--mirror|--delete|--prune|['"]-f['"]|['"]-d['"]|['"]\+/;

let planted: string;

beforeEach(async () => {
    planted = await mkdtemp(join(tmpdir(), 'mandor-git-'));
});

afterEach(async () => {
    await rm(planted, { recursive: true, force: true });
});

function forcingIn(files: SourceFile[]): string[] {
    return files
        .filter((file) => (file.text.match(PUSH_ARGS) ?? []).some((args) => FORCING.test(args)))
        .map((file) => file.path);
}

describe('forcing git', () => {
    /** The repo belongs to the user. Mandor overwrites history in it on no path, ever. */
    it('is spelled in the arguments of a push nowhere in any package or app', async () => {
        expect(forcingIn(await repoSourceFiles())).toEqual([]);
    });

    it.each([
        ["await run(['push', '--force'], root);"],
        ["await run(['push', '--force-with-lease', 'origin'], root);"],
        ["await run(['push', '--mirror', url], root);"],
        ["await run(['push', '-f', 'origin', 'main'], root);"],
        ["await run(['push', 'origin', '+main:main'], root);"],
        ["await run(['push', '--delete', 'origin', 'main'], root);"],
    ])('is caught when a module starts to spell it: %s', async (line) => {
        await writeFile(join(planted, 'sync.ts'), `${line}\n`);

        expect(forcingIn(await sourceFilesOf(planted))).toEqual(['sync.ts']);
    });

    it('lets an ordinary push be', async () => {
        await writeFile(
            join(planted, 'sync.ts'),
            "await run(['push', '-u', 'origin', ref], root);\n",
        );

        expect(forcingIn(await sourceFilesOf(planted))).toEqual([]);
    });
});
