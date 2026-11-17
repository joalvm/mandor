import { REPO_FORMAT } from './repo-format.js';
import { parseRepo } from './parse-repo.js';
import type { Repo } from './repo.js';

export type CreateRepoInput = {
    name: string;
    workspaces?: readonly string[];
};

/** Creates an empty repo at the current format version. No disk, no clock. */
export function createRepo({ name, workspaces }: CreateRepoInput): Repo {
    const repo = { formatVersion: REPO_FORMAT, name, workspaces: workspaces ?? [] };

    return parseRepo(repo);
}
