/**
 * What a git failure means, in the terms the interface decides on. The raw output of git
 * never travels with the code: it names paths and remotes and belongs in the log.
 */
export type GitErrorCode =
    /** No git on this machine. Mandor stays alive and works without history. */
    | 'git-missing'
    /** The directory git was pointed at is not a repository. */
    | 'git-not-a-repo'
    /** Git ran and refused for a reason of its own. The log has it, the code does not. */
    | 'git-failed';

/** What a spawn reports when the binary is not on `PATH`, on every platform. */
const MISSING = 'enoent';

/** What git prints when the directory it was pointed at has no `.git`. */
const NOT_A_REPO = 'not a git repository';

/** Reads a thrown value as one of the codes. Anything unrecognised is a plain failure. */
export function gitErrorCodeOf(error: unknown): GitErrorCode {
    const text = error instanceof Error ? error.message.toLowerCase() : '';

    if (text.includes(MISSING)) {
        return 'git-missing';
    }

    if (text.includes(NOT_A_REPO)) {
        return 'git-not-a-repo';
    }

    return 'git-failed';
}
