import { join, relative, sep } from 'node:path';

import { assertDocName } from '@mandor/schema';

import { workspaceDir } from '../workspace/workspace-path.js';

const DOCS_DIR = 'docs';

/** What git uses, whatever the machine uses. */
const POSIX_SEPARATOR = '/';

/** Where the notes of a workspace live: markdown files, flat, beside the rest of the workspace. */
export function docsDir(root: string, workspaceId: string): string {
    return join(workspaceDir(root, workspaceId), DOCS_DIR);
}

/** Path of one doc. The name comes from a list or from a link, so it is checked before `join`. */
export function docFile(root: string, workspaceId: string, name: string): string {
    assertDocName(name);

    return join(docsDir(root, workspaceId), name);
}

/**
 * Where the doc sits inside the repo, spelled the way git spells a pathspec: relative to the
 * root and with forward slashes on every platform. Git is the only reader of this form, and it
 * is asked about a file by the path the history has, not by the path the machine has.
 */
export function docRepoPath(root: string, workspaceId: string, name: string): string {
    return relative(root, docFile(root, workspaceId, name))
        .split(sep)
        .join(POSIX_SEPARATOR);
}
