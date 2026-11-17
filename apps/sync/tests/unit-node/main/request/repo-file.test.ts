import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readRepoFile } from '../../../../src/main/request/repo-file.js';
import { RepoFileError } from '../../../../src/main/request/repo-file-error.js';

let base: string;
let root: string;

beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), 'mandor-repo-file-'));
    root = join(base, 'repo');
    await mkdir(join(root, 'fixtures'), { recursive: true });
    await mkdir(join(base, 'outside'));
    await writeFile(join(root, 'fixtures', 'a.bin'), Buffer.from([1, 2, 3]));
    await writeFile(join(base, 'outside', 'secret.txt'), 'nope');
});

afterEach(async () => {
    await rm(base, { recursive: true, force: true });
});

describe('reading a file the request names', () => {
    it('reads a file that lives inside the repo, relative to its root', async () => {
        const bytes = await readRepoFile(root, 'fixtures/a.bin');

        expect([...bytes]).toEqual([1, 2, 3]);
    });

    it('refuses a path that climbs out of the repo', async () => {
        await expect(readRepoFile(root, '../outside/secret.txt')).rejects.toBeInstanceOf(
            RepoFileError,
        );
    });

    it('refuses an absolute path', async () => {
        await expect(
            readRepoFile(root, join(base, 'outside', 'secret.txt')),
        ).rejects.toBeInstanceOf(RepoFileError);
    });

    /** The schema rejected the path already, but main does not trust the renderer. */
    it('refuses a link inside the repo that leads outside of it', async () => {
        await symlink(join(base, 'outside'), join(root, 'fixtures', 'link'), 'junction');

        await expect(readRepoFile(root, 'fixtures/link/secret.txt')).rejects.toBeInstanceOf(
            RepoFileError,
        );
    });

    /**
     * A collection a collaborator shares can name any path of the repo as a body, and the send
     * goes to a URL they chose. The folder of history may hold a token in the address it syncs
     * with, and the one of the app holds what never leaves the machine.
     */
    it.each(['.git/config', '.mandor/secrets.yaml', '.GIT/config', 'fixtures/../.git/config'])(
        'refuses %s, which belongs to the app and not to the work',
        async (path) => {
            await mkdir(join(root, '.git'));
            await mkdir(join(root, '.mandor'));
            await writeFile(join(root, '.git', 'config'), 'url = https://token@x.test/r.git');
            await writeFile(join(root, '.mandor', 'secrets.yaml'), 'ref: a');

            await expect(readRepoFile(root, path)).rejects.toBeInstanceOf(RepoFileError);
        },
    );

    it('refuses a link inside the repo that leads to the folder of history', async () => {
        await mkdir(join(root, '.git'));
        await writeFile(join(root, '.git', 'config'), 'url = https://token@x.test/r.git');
        await symlink(join(root, '.git'), join(root, 'fixtures', 'history'), 'junction');

        await expect(readRepoFile(root, 'fixtures/history/config')).rejects.toBeInstanceOf(
            RepoFileError,
        );
    });

    it('reads a file whose name only starts like the folder of history', async () => {
        await writeFile(join(root, '.gitignore'), 'x');

        await expect(readRepoFile(root, '.gitignore')).resolves.toHaveLength(1);
    });

    it('refuses a file that is not there', async () => {
        await expect(readRepoFile(root, 'fixtures/none.bin')).rejects.toBeInstanceOf(RepoFileError);
    });
});
