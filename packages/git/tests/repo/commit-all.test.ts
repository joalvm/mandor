import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { run } from '../../src/git/run.js';
import { commitAll } from '../../src/repo/commit-all.js';
import { PRIVATE_DIR } from '../../src/repo/private-dir.js';
import { status } from '../../src/repo/status.js';
import { withoutIdentity } from '../support/git-environment.js';
import { initializedRepos, removeRepo, type Repo } from '../support/repo.js';

const initialized = initializedRepos();

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

function lastCommit(format: string): Promise<string> {
    return run(['log', '-1', `--pretty=${format}`], root);
}

function commitCount(): Promise<string> {
    return run(['rev-list', '--count', 'HEAD'], root);
}

describe('committing everything the app just wrote', () => {
    it('leaves the working tree clean', async () => {
        await writeFile(join(root, 'mandor.yaml'), 'name: Mi repo\n', 'utf8');

        expect((await status(root)).untracked).toEqual(['mandor.yaml']);

        await commitAll(root, 'create workspace api-pagos');

        expect((await status(root)).clean).toBe(true);
    });

    it('records the message it was given', async () => {
        await writeFile(join(root, 'mandor.yaml'), 'name: Mi repo\n', 'utf8');

        await commitAll(root, 'create workspace api-pagos');

        expect(await lastCommit('%s')).toBe('create workspace api-pagos');
    });

    /** A save that changed nothing must not leave a commit saying it did. */
    it('commits nothing when nothing changed', async () => {
        const before = await commitCount();

        await commitAll(root, 'create workspace api-pagos');

        expect(await commitCount()).toBe(before);
    });

    /** Most CI machines have no identity, and a repo that cannot commit loses the work. */
    it('commits with the identity of the repo when the machine has none', async () => {
        await writeFile(join(root, 'mandor.yaml'), 'name: Mi repo\n', 'utf8');

        await commitAll(root, 'create workspace api-pagos');

        expect(await lastCommit('%an <%ae>')).toBe('Mandor <mandor@localhost>');
    });

    /**
     * The ignore rule is a file of the repo, and a change pulled from someone else can take it
     * away. The private files must stay out of the commit all the same: the next sync would
     * publish them.
     */
    it('leaves the private files out even when nothing ignores them', async () => {
        await writeFile(join(root, '.gitignore'), '', 'utf8');
        await mkdir(join(root, PRIVATE_DIR), { recursive: true });
        await writeFile(join(root, PRIVATE_DIR, 'cookies.json'), '{"session":"s3cret"}', 'utf8');
        await writeFile(join(root, 'mandor.yaml'), 'name: Mi repo\n', 'utf8');

        await commitAll(root, 'create workspace api-pagos');

        const committed = await run(['ls-tree', '-r', '--name-only', 'HEAD'], root);

        expect(committed.split('\n')).toContain('mandor.yaml');
        expect(committed).not.toContain(PRIVATE_DIR);
    });

    /** The usual case: the rule is there and so is the directory. Git must not take it as an error. */
    it('commits past the private directory when the rule ignores it', async () => {
        await mkdir(join(root, PRIVATE_DIR), { recursive: true });
        await writeFile(join(root, PRIVATE_DIR, 'cookies.json'), '{}', 'utf8');
        await writeFile(join(root, 'mandor.yaml'), 'name: Mi repo\n', 'utf8');

        await commitAll(root, 'create workspace api-pagos');

        expect(await lastCommit('%s')).toBe('create workspace api-pagos');
    });

    /** A private file a commit already carries leaves the next one; the copy on disk stays. */
    it('takes a private file that slipped into the history out of the next commit', async () => {
        await mkdir(join(root, PRIVATE_DIR), { recursive: true });
        await writeFile(join(root, PRIVATE_DIR, 'cookies.json'), '{}', 'utf8');
        await run(['add', '-f', '--', `${PRIVATE_DIR}/cookies.json`], root);
        await commitAll(root, 'a commit that carried it');
        await writeFile(join(root, 'mandor.yaml'), 'name: Mi repo\n', 'utf8');

        await commitAll(root, 'create workspace api-pagos');

        expect(await run(['ls-tree', '-r', '--name-only', 'HEAD'], root)).not.toContain(
            PRIVATE_DIR,
        );
        await expect(readFile(join(root, PRIVATE_DIR, 'cookies.json'), 'utf8')).resolves.toBe('{}');
    });
});
