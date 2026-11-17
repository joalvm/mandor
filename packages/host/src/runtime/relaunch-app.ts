import { app } from 'electron';

import { flushAllCommits } from '../repo/commit-scheduler.js';
import { writesSettled } from './write-drain.js';

/**
 * Starts the app over without losing what was in the air: the writes land first and the edits
 * that waited for their calm are committed, the same road a quit takes. After a fault of main
 * the state may be broken, and this is the way out the person is offered.
 */
export async function relaunchApp(): Promise<void> {
    await writesSettled();
    await flushAllCommits();

    app.relaunch();
    app.exit();
}
