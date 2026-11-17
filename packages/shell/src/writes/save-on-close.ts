import { fireAndForget } from '../fire-and-forget.js';
import { shellStore, type ShellStoreApi } from '../shell-store.js';
import { settlePendingWrites } from './pending-writes.js';

/**
 * Writes what the window still owes the disk on the way out: the edits waiting for the typing to
 * stop, and the arrangement of the window.
 *
 * Both are saved on a pause, because writing on each keystroke would write a file a dozen times
 * a second. A window closed inside that pause would lose the last sentence, and come back as it
 * was before the last drag. `pagehide` is the last moment the renderer is alive, and what it
 * hands to main is written by a process that outlives it.
 */
export function saveOnClose(store: ShellStoreApi = shellStore): () => void {
    const save = (): void => {
        fireAndForget(settlePendingWrites());
        store.getState().saveSession();
    };

    window.addEventListener('pagehide', save);

    return () => {
        window.removeEventListener('pagehide', save);
    };
}
