import type { ChangedEntity } from '@mandor/schema';
import { listConflicts } from '@mandor/store-fs';

import type { StoredOrigin } from '../origin/stored-origin.js';
import { announceMergeNote } from '../repo/conflict-events.js';
import { entitiesOfPaths } from '../repo/entities-of-paths.js';
import { migrateOrigin } from '../repo/migrate-origin.js';
import { rememberDisk } from '../repo/remember-disk.js';
import type { SyncStepDeps } from './sync-step.js';

/**
 * What a step uses in the app: the clashes kept on disk, what a merge of a divergence uses and
 * the window told what a move forward changed. The disk is taken as what the window believes before it is told, so the
 * watcher does not read the files that arrived as somebody else's edit and commit them again.
 */
export function stepDepsOf(
    origin: Pick<StoredOrigin, 'root'>,
    access: SyncStepDeps['access'],
    push: (entities: ChangedEntity[]) => void,
): SyncStepDeps {
    return {
        access,
        hasConflicts: async () => (await listConflicts(origin.root)).conflicts.length > 0,
        followed: async (paths) => {
            await rememberDisk(origin.root, paths);

            const entities = entitiesOfPaths(paths);

            if (entities.length > 0) {
                push(entities);
            }
        },
        mergeDeps: { push, warn: announceMergeNote },
        migrate: async () => {
            const entities = entitiesOfPaths(await migrateOrigin(origin.root));

            if (entities.length > 0) {
                push(entities);
            }
        },
    };
}
