import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';

import { shellStore } from '../shell-store.js';

/** How many groups the window has open, which is one panel each in whatever draws the grid. */
function openGroups(): number {
    return leavesOf(shellStore.getState().grid).length;
}

/**
 * Splits the group the window opens in and closes the split again, answering with how many
 * groups stood after each step.
 *
 * The grid is of shell, so the answer cannot depend on which app mounted it, and the same test
 * runs over both windows by passing this the window it drew.
 *
 * `run` is what lets the renderer see the change — `act` in a test — so nothing here imports a
 * test runner or a renderer, the same reason the editor double next to it imports neither.
 * What `run` answers is not read: `act` hands back a thenable that a synchronous change has
 * nothing to await.
 */
export function splitAndRestore(run: (change: () => void) => unknown): number[] {
    let created = '';

    run(() => {
        created = shellStore.getState().splitGroup(ROOT_GROUP_ID, 'row');
    });

    const split = openGroups();

    run(() => {
        shellStore.getState().closeGroup(created);
    });

    return [split, openGroups()];
}
