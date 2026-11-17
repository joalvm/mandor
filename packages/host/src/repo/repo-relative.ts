import { relative, sep } from 'node:path';

/** What git uses, whatever the machine uses. */
const POSIX_SEPARATOR = '/';

/**
 * Spells a path inside the repo the way git spells a pathspec: relative to the root and with
 * forward slashes on every platform. It is the form the keys of the scheduler and the paths of
 * a commit share, so two writes of one file always meet under one name.
 */
export function repoRelative(root: string, absolute: string): string {
    return relative(root, absolute).split(sep).join(POSIX_SEPARATOR);
}
