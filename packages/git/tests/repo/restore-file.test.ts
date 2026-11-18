import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GitError } from '../../src/git/git-error.js';
import { commitAll } from '../../src/repo/commit-all.js';
import { restoreFile } from '../../src/repo/restore-file.js';
import { withoutIdentity } from '../support/git-environment.js';
import { initializedRepos, removeRepo, type Repo } from '../support/repo.js';

const DOCS = 'docs';
const DOC = 'docs/notas.md';

const initialized = initializedRepos(async (root) => {
    await mkdir(join(root, DOCS), { recursive: true });
});

let repo: Repo;
let root: string;

beforeEach(async () => {
    repo = await initialized();
    root = repo.root;

    withoutIdentity();
});

afterEach(async () => {
    await removeRepo(repo);
});

function write(text: string): Promise<void> {
    return writeFile(join(root, DOC), text, 'utf8');
}

function read(): Promise<string> {
    return readFile(join(root, DOC), 'utf8');
}

describe('taking a file back to its last commit', () => {
    /** The second level of undo: the editor undoes keystrokes, this undoes the session. */
    it('brings back the text the last commit holds', async () => {
        await write('La primera versión.\n');
        await commitAll(root, 'write notas');
        await write('Un desastre.\n');

        await restoreFile(root, DOC);

        expect(await read()).toBe('La primera versión.\n');
    });

    it('leaves a file that was never touched as it is', async () => {
        await write('La única versión.\n');
        await commitAll(root, 'write notas');

        await restoreFile(root, DOC);

        expect(await read()).toBe('La única versión.\n');
    });

    /** A file the history never saw has no earlier text, and inventing one would delete work. */
    it('refuses a file that was never committed', async () => {
        await write('Escrito y nunca guardado.\n');

        await expect(restoreFile(root, DOC)).rejects.toBeInstanceOf(GitError);
        expect(await read()).toBe('Escrito y nunca guardado.\n');
    });
});
