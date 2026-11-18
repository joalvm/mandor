import { registerResourceMove } from '@mandor/shell';

import { composerEventsStore } from './composer-events-store.js';

/**
 * Keeps every composer pointing at the event it is holding after the file moved under it. A
 * rename is not a close: the window keeps the tab, so the composer has to keep the address, or
 * the trail above it hangs from a file that is no longer there.
 *
 * Returns the release, which is the app's to call when it takes its tab kinds down.
 */
export function followComposerEventMoves(): () => void {
    return registerResourceMove((from, to) => {
        composerEventsStore.getState().moveEvent(from, to);
    });
}
