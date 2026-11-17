import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Exports only commit history and review metadata, never the host's Git configuration. */
export function prepareGitSnapshot({ cwd, base, directory }) {
    const git = (args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
    const baseRef = git(['rev-parse', '--symbolic-full-name', base]);

    if (!baseRef.startsWith('refs/')) {
        throw new Error('QA_BASE must name a Git ref. Fetch the integration branch first.');
    }

    git(['merge-base', '--is-ancestor', base, 'HEAD']);

    const metadata = {
        head: git(['rev-parse', 'HEAD']),
        base: git(['rev-parse', base]),
        baseRef,
        branch: process.env.QA_BRANCH ?? git(['branch', '--show-current']),
        title: process.env.QA_TITLE ?? git(['log', '-1', '--format=%s']),
        dirty: git(['status', '--porcelain']).length > 0,
    };

    git(['bundle', 'create', join(directory, 'repository.bundle'), 'HEAD', baseRef]);
    writeFileSync(join(directory, 'metadata.json'), JSON.stringify(metadata, null, 2));

    return metadata;
}
