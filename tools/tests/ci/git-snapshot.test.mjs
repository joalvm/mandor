import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { prepareGitSnapshot } from '../../ci/prepare-git-snapshot.mjs';
import { restoreGitSnapshot } from '../../ci/restore-git-snapshot.mjs';

const roots = [];

afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function git(cwd, args) {
    return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

async function repository() {
    const root = await mkdtemp(join(tmpdir(), 'mandor-ci-snapshot-'));

    roots.push(root);
    git(root, ['init', '-q', '-b', 'main']);
    git(root, ['config', 'user.name', 'CI test']);
    git(root, ['config', 'user.email', 'ci@example.test']);
    await writeFile(join(root, 'sample.txt'), 'base');
    git(root, ['add', '.']);
    git(root, ['commit', '-qm', 'build: base']);
    git(root, ['branch', 'base']);
    git(root, ['switch', '-qc', 'feat/example']);

    return root;
}

describe('Docker Git snapshots', () => {
    it('restores commit history without copying host configuration or overwriting source edits', async () => {
        const source = await repository();
        const target = await mkdtemp(join(tmpdir(), 'mandor-ci-target-'));
        const input = await mkdtemp(join(tmpdir(), 'mandor-ci-input-'));

        roots.push(target, input);
        git(source, ['config', 'private.marker', 'host-only']);
        await writeFile(join(source, 'sample.txt'), 'committed');
        git(source, ['commit', '-qam', 'feat: example']);
        await writeFile(join(source, 'sample.txt'), 'working edit');
        await writeFile(join(target, 'sample.txt'), 'working edit');
        const metadata = prepareGitSnapshot({ cwd: source, base: 'base', directory: input });

        restoreGitSnapshot({ cwd: target, directory: input });

        expect(git(target, ['rev-parse', 'HEAD'])).toBe(metadata.head);
        expect(git(target, ['rev-parse', 'refs/remotes/qa/base'])).toBe(metadata.base);
        expect(await readFile(join(target, 'sample.txt'), 'utf8')).toBe('working edit');
        expect(git(target, ['config', '--local', '--list'])).not.toContain('host-only');
        expect(metadata.dirty).toBe(true);
        expect(metadata.branch).toBe('feat/example');
    });

    it('rejects a missing base instead of silently validating against main', async () => {
        const source = await repository();
        const input = await mkdtemp(join(tmpdir(), 'mandor-ci-input-'));

        roots.push(input);

        expect(() =>
            prepareGitSnapshot({ cwd: source, base: 'missing', directory: input }),
        ).toThrow();
    });
});
