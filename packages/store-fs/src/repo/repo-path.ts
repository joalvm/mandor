import { join } from 'node:path';

/** Its presence at the root is what turns a directory into a repo. */
const REPO_FILE = 'mandor.yaml';

/** The variables every workspace of the origin shares: the one domain of the repo itself. */
const GLOBALS_FILE = 'globals.yaml';

/** Cache, indexes and secret references. Gitignored from the first commit on. */
const PRIVATE_DIR = '.mandor';

/** The only container the repo owns: everything with domain lives one level below. */
const WORKSPACES_DIR = 'workspaces';

/** Path of the repo file. Every path in the package descends from a root, never from `cwd`. */
export function repoFile(root: string): string {
    return join(root, REPO_FILE);
}

/** Path of the private directory. Nothing written here is meant to reach git. */
export function globalsFile(root: string): string {
    return join(root, GLOBALS_FILE);
}

export function mandorDir(root: string): string {
    return join(root, PRIVATE_DIR);
}

/** Path of the workspaces container. */
export function workspacesDir(root: string): string {
    return join(root, WORKSPACES_DIR);
}

/** Path of the ignore file. `.mandor/` is listed there from the first commit on. */
export function gitignoreFile(root: string): string {
    return join(root, '.gitignore');
}

/** Path of the attributes file. It pins the line ending for every file in the repo. */
export function gitattributesFile(root: string): string {
    return join(root, '.gitattributes');
}
