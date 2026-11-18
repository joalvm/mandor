import { flushCommits } from '../repo/commit-scheduler.js';
import { activeOriginRoot, setActiveOrigin } from './active-origin.js';
import { closeOriginRuntime } from './origin-runtime.js';

/**
 * Leaves the active origin: what it still owes the history is committed, its watcher and its
 * sync stop, and the window is between origins until another one opens. Whoever takes the
 * directory away next (a switch, a removal) finds nobody writing into it.
 */
export async function leaveActiveOrigin(): Promise<void> {
    const outgoing = activeOriginRoot();

    if (outgoing !== null) {
        await flushCommits(outgoing);
    }

    closeOriginRuntime();
    setActiveOrigin(null);
}
