import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Restores history and index while preserving the source snapshot that Docker built. */
export function restoreGitSnapshot({ cwd, directory }) {
    const metadata = JSON.parse(readFileSync(join(directory, 'metadata.json'), 'utf8'));
    const git = (args) => execFileSync('git', args, { cwd, stdio: 'pipe' });

    git(['init', '-q', '-b', 'local-ci']);
    git([
        'fetch',
        '-q',
        '--update-head-ok',
        join(directory, 'repository.bundle'),
        'HEAD:refs/heads/local-ci',
        `${metadata.baseRef}:refs/remotes/qa/base`,
    ]);
    git(['reset', '--mixed', '-q', 'HEAD']);

    return metadata;
}
