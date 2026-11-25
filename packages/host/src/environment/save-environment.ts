import type { RepoChange } from '@mandor/git';
import {
    updateEnvironment as editEnvironment,
    type EnvironmentPatch,
    environmentFile,
    environmentTextWith,
    keepSecrets,
} from '@mandor/store-fs';

import type { ActiveRepo } from '../origin/active-repo.js';
import { guardedWrite } from '../repo/guarded-write.js';
import { nameOnDisk } from '../repo/name-on-disk.js';
import { repoRelative } from '../repo/repo-relative.js';
import { keepEnvironmentSecrets } from '../secret/keep-environment-secrets.js';

/** One edit of an environment of the open origin, whoever asks for it: the window or a script. */
export type SaveEnvironmentRequest = {
    userDataDir: string;
    repo: ActiveRepo;
    workspaceId: string;
    environmentId: string;
    changes: EnvironmentPatch;
};

/** Where one environment sits inside the repo, spelled for git. */
export function environmentPath(root: string, workspaceId: string, environmentId: string): string {
    return repoRelative(root, environmentFile(root, workspaceId, environmentId));
}

/**
 * Writes an edit of an environment through the one door: the secret values go to the keychain of
 * the system before a byte of the file moves, the file never holds them, and an edit of the disk
 * that came in meanwhile is merged instead of laid over.
 */
export async function saveEnvironment(request: SaveEnvironmentRequest): Promise<void> {
    const { repo, workspaceId, environmentId, changes } = request;
    const { root } = repo;
    const path = environmentPath(root, workspaceId, environmentId);
    const keep = keepEnvironmentSecrets({
        userDataDir: request.userDataDir,
        root,
        place: { repo: repo.id, workspaceId, environmentId },
    });

    await guardedWrite({
        root,
        path,
        // Started here, awaited after the turn: a save with a new name, which reads nothing,
        // does not overtake one sent before it.
        change: Promise.resolve(changes.name ?? nameOnDisk(root, path)).then(
            (name): RepoChange => ({ kind: 'update-environment', name }),
        ),
        beforeWrite: () => keepSecrets(keep, { variables: changes.variables ?? [] }),
        oursFrom: (base) => environmentTextWith(base ?? '', changes),
        write: async () => {
            await editEnvironment({ root, workspaceId, environmentId, changes });
        },
    });
}
