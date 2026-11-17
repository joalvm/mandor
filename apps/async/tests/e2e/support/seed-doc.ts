import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const WORKSPACES = 'workspaces';
const DOCS = 'docs';

/** The workspace the first run laid out, read from the repo instead of assumed by name. */
async function onlyWorkspace(repoRoot: string): Promise<string> {
    const entries = await readdir(join(repoRoot, WORKSPACES), { withFileTypes: true });
    const workspace = entries.find((entry) => entry.isDirectory());

    if (workspace === undefined) {
        throw new Error('the repository has no workspace to write a doc into');
    }

    return workspace.name;
}

/**
 * Writes one markdown file where the workspace keeps its notes. Nothing in the window creates
 * a doc yet: they are files of the repo, and this is a run of the app over files that are
 * already there, which is how a note written on another machine arrives.
 */
export async function seedDoc(repoRoot: string, name: string, body: string): Promise<void> {
    const dir = join(repoRoot, WORKSPACES, await onlyWorkspace(repoRoot), DOCS);

    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), body, 'utf8');
}
