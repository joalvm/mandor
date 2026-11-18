import { FormatVersionError, parseRepo, type Repo, type Workspace } from '@mandor/schema';

import type { LoadWarning } from '../disk/load-warning.js';
import { readDocument } from '../disk/read-document.js';
import { listWorkspaces } from '../workspace/list-workspaces.js';
import { repoFile } from './repo-path.js';

export type LoadedRepo = {
    repo: Repo | null;
    workspaces: Workspace[];
    warnings: LoadWarning[];
};

/** What the warning says when a newer build saved the repo: this one does not open it. */
const NEWER_FORMAT = 'saved by a newer version of Mandor';

/**
 * Loads a repo and its workspaces. A file that fails becomes a warning, not an empty repo; a repo
 * a newer build saved does not open at all, and its warning says why instead of how it broke.
 */
export async function loadRepo(root: string): Promise<LoadedRepo> {
    // Set from inside the reader: the warning keeps the message, not the class of the error.
    const seen = { newer: false };
    const read = await readDocument(repoFile(root), (input) => {
        try {
            return parseRepo(input);
        } catch (error) {
            seen.newer = error instanceof FormatVersionError;

            throw error;
        }
    });

    if (!read.ok) {
        const warning = seen.newer
            ? { path: read.warning.path, message: NEWER_FORMAT }
            : read.warning;

        return { repo: null, workspaces: [], warnings: [warning] };
    }

    const listed = await listWorkspaces(root, read.value.workspaces);

    return { repo: read.value, ...listed };
}
