import { chmod, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { run } from '../../src/git/run.js';
import { initRepo } from '../../src/repo/init-repo.js';
import { withFixedIdentity } from '../support/git-environment.js';
import { createRepo, removeRepo, type Repo } from '../support/repo.js';

let repo: Repo;
let root: string;

beforeEach(async () => {
    repo = await createRepo();
    root = repo.root;

    withFixedIdentity();
});

afterEach(async () => {
    await removeRepo(repo);
});

function branchOf(dir: string): Promise<string> {
    return run(['rev-parse', '--abbrev-ref', 'HEAD'], dir);
}

function commitCountOf(dir: string): Promise<string> {
    return run(['rev-list', '--count', 'HEAD'], dir);
}

describe('initialising a git repo', () => {
    it('creates the repository on the main branch', async () => {
        await initRepo(root);

        expect(await branchOf(root)).toBe('main');
    });

    it('leaves the working tree clean', async () => {
        await initRepo(root);

        expect(await run(['status', '--porcelain'], root)).toBe('');
    });

    it('records the scaffold in a single commit', async () => {
        await initRepo(root);

        expect(await commitCountOf(root)).toBe('1');
    });

    /** Secrets and session state live in `.mandor/`; committing them would publish them. */
    it('writes the git files the directory was missing', async () => {
        await initRepo(root);

        expect(await readFile(join(root, '.gitignore'), 'utf8')).toContain('.mandor/');
        expect(await readFile(join(root, '.gitattributes'), 'utf8')).toContain(
            '* text=auto eol=lf',
        );
    });

    it('keeps the rules the directory already had', async () => {
        await writeFile(join(root, '.gitignore'), 'node_modules/\n', 'utf8');

        await initRepo(root);

        const ignore = await readFile(join(root, '.gitignore'), 'utf8');

        expect(ignore).toContain('node_modules/');
        expect(ignore).toContain('.mandor/');
    });

    /** Read as empty, a file locked for a moment would be written back with one rule left. */
    // skip-policy: Windows has no file mode that lets a file be written and not read.
    it.skipIf(process.platform === 'win32')(
        'leaves alone a file it cannot read, and says so',
        async () => {
            const file = join(root, '.gitignore');

            await writeFile(file, 'node_modules/\n', 'utf8');
            await chmod(file, 0o200);

            await expect(initRepo(root)).rejects.toMatchObject({ code: 'EACCES' });

            await chmod(file, 0o600);

            expect(await readFile(file, 'utf8')).toBe('node_modules/\n');
        },
    );

    /** What stands where the file goes and cannot be read, on every system: a directory. */
    it('leaves alone a .gitignore it cannot read as a file, and says so', async () => {
        await mkdir(join(root, '.gitignore', 'kept'), { recursive: true });

        await expect(initRepo(root)).rejects.toMatchObject({ code: 'EISDIR' });

        expect(await readdir(join(root, '.gitignore'))).toEqual(['kept']);
    });

    /** Appending to a file that has no final newline would glue two rules into one. */
    it('adds the missing rule on its own line', async () => {
        await writeFile(join(root, '.gitignore'), 'node_modules/', 'utf8');

        await initRepo(root);

        expect(await readFile(join(root, '.gitignore'), 'utf8')).toBe('node_modules/\n.mandor/\n');
    });

    /** A rule is a whole line: a comment or another path that only mentions it ignores nothing. */
    it('adds the rule when the file only mentions it inside another line', async () => {
        await writeFile(join(root, '.gitignore'), '# keep .mandor/ out\nbuild.mandor/\n', 'utf8');

        await initRepo(root);

        await expect(run(['check-ignore', '.mandor/secrets.json'], root)).resolves.toBe(
            '.mandor/secrets.json',
        );
    });

    it('adopts a directory that is already a repository', async () => {
        await run(['init', '-b', 'trunk'], root);
        await writeFile(join(root, 'mandor.yaml'), 'name: Mi repo\n', 'utf8');
        await run(['add', '-A', '--', '.'], root);
        await run(['commit', '-m', 'first'], root);

        await initRepo(root);

        expect(await branchOf(root)).toBe('trunk');
        expect(await commitCountOf(root)).toBe('2');
    });

    /** Running it twice is what happens when the app reopens a repo it already made. */
    it('commits nothing when the repository is already in shape', async () => {
        await initRepo(root);

        await initRepo(root);

        expect(await commitCountOf(root)).toBe('1');
    });
});
