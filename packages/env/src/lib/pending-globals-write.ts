import type { Variable } from '@mandor/schema';
import { createPendingWrites } from '@mandor/shell';

import { envStore } from '../env-store.js';
import { writableVariables } from './writable-variables.js';

/** The globals are one list per origin: one key, and the origin is the store's to know. */
const ORIGIN = 'globals';

const PENDING = createPendingWrites<string, readonly Variable[]>((_key, variables) =>
    envStore.getState().setGlobals(variables),
);

/**
 * Writes the globals a moment after the last key, like an environment: typing a value is many
 * changes and one write. A list that cannot be written yet — a line with no name — waits.
 */
export function scheduleGlobalsWrite(variables: readonly Variable[]): void {
    const writable = writableVariables(variables);

    if (writable === null) {
        PENDING.cancel(ORIGIN);

        return;
    }

    PENDING.schedule(ORIGIN, writable);
}

/** Writes now what waits, before the globals are read again from disk. */
export function flushPendingGlobalsWrite(): Promise<void> {
    return PENDING.flush(ORIGIN);
}
