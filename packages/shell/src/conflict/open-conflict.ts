import type { ConflictSummary } from '@mandor/ipc';

import { originName } from '../origin-name.js';
import { shellStore } from '../shell-store.js';
import { conflictResource, conflictTabId } from './conflict-resource.js';

/**
 * Shows a clash in the centre, from wherever the person noticed it: a row, a tab, a notice, the
 * list of the origin. One tab per clash, so asking again finds the one that is open. A clash is
 * kept under the workspace it clashed in; one that names none has nowhere to be shown.
 */
export function openConflict(conflict: ConflictSummary): void {
    if (!('workspaceId' in conflict.entity)) {
        return;
    }

    const shell = shellStore.getState();

    shell.openTab(shell.activeGroupId, {
        id: conflictTabId(conflict.id),
        kind: 'conflict',
        resource: conflictResource(originName(), conflict.entity.workspaceId, conflict.id),
    });
}
