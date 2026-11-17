import type { GitErrorCode } from './git-error-code.js';

/**
 * A git command that refused. `code` is what the interface decides on; `detail` carries the
 * raw output of git for the log alone, so no path or remote of the user reaches the screen.
 */
export class GitError extends Error {
    constructor(
        readonly code: GitErrorCode,
        readonly detail: string,
    ) {
        super(`git refused: ${code}`);
        this.name = 'GitError';
    }
}
