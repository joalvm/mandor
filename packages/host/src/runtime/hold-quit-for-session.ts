import { app } from 'electron';

import { flushAllCommits } from '../repo/commit-scheduler.js';
import { writesSettled } from './write-drain.js';

/**
 * Lets the session reach the disk before the process goes away.
 *
 * The window hands its arrangement over as it is closing, which is the same moment the app is
 * told to exit. Without this the file is left half written, and what comes back is the window
 * from before the last thing the user did to it.
 *
 * What was edited and still waits for its calm is committed here too: closing is the end of the
 * calm, and an edit that never reached the history would be the one the user cannot go back to.
 *
 * A version already downloaded is installed on the way out: `installOnQuit` starts its installer,
 * which runs on its own, and the process still ends here. The library would end it with a second
 * `quit()`, which a cancelled `will-quit` leaves without effect, and the app would stay up with
 * the installer waiting for it to go.
 */
export function holdQuitForSession(installOnQuit: () => void = () => undefined): void {
    let waited = false;

    app.on('will-quit', (event) => {
        if (waited) {
            return;
        }

        event.preventDefault();
        void settle().then(() => {
            waited = true;

            // A second `quit()` from inside a cancelled `will-quit` can leave the process alive for
            // good on Windows. Everything that had to run on the way out already has: the
            // disposers ran in this same event, and the writes have settled.
            installOnQuit();
            app.exit();
        });
    });
}

/** Writes first, so the edits in flight are on disk, and then the commits that were waiting. */
export async function settle(): Promise<void> {
    await writesSettled();
    await flushAllCommits();
}
