import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { run } from '../../src/git/run.js';
import { commitIn, ensureIdentity } from '../../src/repo/ensure-identity.js';
import { withoutIdentity } from '../support/git-environment.js';
import { createRepo, removeRepo, type Repo } from '../support/repo.js';

let repo: Repo;
let root: string;

beforeEach(async () => {
    repo = await createRepo();
    root = repo.root;

    withoutIdentity();

    await run(['init', '-b', 'main'], root);
});

afterEach(async () => {
    await removeRepo(repo);
});

function configured(key: string): Promise<string> {
    return run(['config', '--get', '--default', '', key], root);
}

describe('giving a repo an identity to commit with', () => {
    /** A machine with no `user.name` cannot commit at all, and that is most CI machines. */
    it('writes an identity into the repo when the machine has none', async () => {
        expect(await ensureIdentity(root)).toBe(true);

        expect(await configured('user.name')).toBe('Mandor');
        expect(await configured('user.email')).toBe('mandor@localhost');
    });

    it('leaves the identity the user already configured alone', async () => {
        await run(['config', '--local', 'user.name', 'Alejandro'], root);
        await run(['config', '--local', 'user.email', 'alejandro@example.com'], root);

        expect(await ensureIdentity(root)).toBe(false);

        expect(await configured('user.name')).toBe('Alejandro');
    });

    /** Half an identity is no identity: git refuses the commit just the same. */
    it('completes an identity that is missing the email', async () => {
        await run(['config', '--local', 'user.name', 'Alejandro'], root);

        expect(await ensureIdentity(root)).toBe(true);

        expect(await configured('user.name')).toBe('Alejandro');
        expect(await configured('user.email')).toBe('mandor@localhost');
    });

    it('asks git once per repo, since an identity does not leave by itself', async () => {
        await ensureIdentity(root);
        await run(['config', '--local', '--unset', 'user.name'], root);

        expect(await ensureIdentity(root)).toBe(false);
        expect(await configured('user.name')).toBe('');
    });

    it('commits in a repo made anew where one that could commit was', async () => {
        await ensureIdentity(root);
        await rm(join(root, '.git'), { recursive: true, force: true });
        await run(['init', '-b', 'main'], root);
        // Without it, git may guess a name from the machine and the commit would not fail.
        await run(['config', '--local', 'user.useConfigOnly', 'true'], root);
        await writeFile(join(root, 'a.txt'), 'a');
        await run(['add', '-A'], root);

        await commitIn(root, ['-m', 'primero']);

        expect(await run(['log', '--format=%an'], root)).toBe('Mandor');
    });

    it('answers the refusal of git when the identity was not what failed', async () => {
        await ensureIdentity(root);

        // A path git does not know: it refuses the commit.
        await expect(commitIn(root, ['-m', 'nada', '--', 'ausente.txt'])).rejects.toThrow();
    });
});
