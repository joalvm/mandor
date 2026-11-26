import { join } from 'node:path';

import { app } from 'electron';

/** The container of the work of both apps. Each app holds its own repo one level further down. */
const FOLDER = 'Mandor';

/** The folder of the one origin that always exists. */
const LOCAL = 'local';

/**
 * Lets the container live somewhere the documents folder is not: a sandbox for an end-to-end
 * run, or a disk the user keeps their work on. It names the container, not the repo: two apps
 * pointed at the same value still never open the same repo. Empty is the same as unset,
 * because a shell that exports the name with no value should not send work to the root.
 */
const OVERRIDE = 'MANDOR_DEFAULT_REPO_ROOT';

/**
 * Where the repo of one app lives. Under the documents folder because a repo is the user's
 * work and not application state. Each app gets its own folder, named by the app: a repo never
 * mixes workspace kinds, and the folder stays free for the origins that are not `local`.
 */
export function defaultRepoRoot(repoFolder: string): string {
    return join(container(), repoFolder, LOCAL);
}

function container(): string {
    const override = process.env[OVERRIDE];

    if (override !== undefined && override.length > 0) {
        return override;
    }

    return join(app.getPath('documents'), FOLDER);
}
