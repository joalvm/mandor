import { ACTIVITY_WINDOW_BYTES } from '@mandor/ipc';
import type { ResourceUri } from '@mandor/schema';
import { scopeToOrigin } from '@mandor/shell';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { ActivityEntry, NewActivityEntry } from './activity-entry.js';
import { activityKept } from './activity-kept.js';
import { initialActivitySlice, type ActivitySlice } from './activity.slice.js';
import type { TimelineNarrowing } from './lib/timeline-narrowing.js';

/**
 * Entries arrive from main in batches and the panel renders virtualized over this buffer. Two
 * caps hold it: one on how many entries it keeps, as many as the person chose, one on what they
 * weigh. A resource that talks without pause trips the first, one that says little but enormous
 * trips the second, and either way the oldest entries are dropped instead of the renderer growing
 * without bound. The most of both is in the contract: main reads it to send a heavy batch with
 * only the tail kept here.
 */

type ActivityActions = {
    appendActivity: (resource: ResourceUri, entries: readonly NewActivityEntry[]) => void;
    clearActivity: (resource: ResourceUri) => void;
    /** Drops from every resource what is past the count kept now, as a lower setting asks. */
    trimActivity: () => void;
    setNarrowing: (resource: ResourceUri, narrowing: TimelineNarrowing) => void;
    reset: () => void;
};

export type ActivityStore = ActivityActions & ActivitySlice;
export type ActivityStoreApi = StoreApi<ActivityStore>;

function without<T>(entries: Record<string, T>, key: string): Record<string, T> {
    return Object.fromEntries(Object.entries(entries).filter(([each]) => each !== key));
}

function weightOf(buffer: readonly ActivityEntry[]): number {
    return buffer.reduce((total, each) => total + each.bytes, 0);
}

/**
 * Drops from the front until both caps hold. The newest entry is never dropped: one frame
 * larger than the whole cap is still the frame that just arrived, and hiding it would be
 * losing the very thing the panel is for.
 */
function trimmed(buffer: readonly ActivityEntry[]): ActivityEntry[] {
    const kept = activityKept.getState().entries;
    let held = weightOf(buffer);
    let start = 0;

    while (
        start < buffer.length - 1 &&
        (buffer.length - start > kept || held > ACTIVITY_WINDOW_BYTES)
    ) {
        held -= buffer[start]?.bytes ?? 0;
        start += 1;
    }

    return buffer.slice(start);
}

function actionsFor(set: ActivityStoreApi['setState']): ActivityActions {
    let sequence = 0;

    function named(batch: readonly NewActivityEntry[]): ActivityEntry[] {
        return batch.map((each) => {
            sequence += 1;

            return { ...each, id: String(sequence) };
        });
    }

    return {
        appendActivity: (resource, batch) => {
            if (batch.length === 0) {
                return;
            }

            const arrived = named(batch);

            set((state) => ({
                entries: {
                    ...state.entries,
                    [resource]: trimmed([...(state.entries[resource] ?? []), ...arrived]),
                },
            }));
        },
        /** What arrived while the view was open goes with the view. Nothing on disk moves. */
        clearActivity: (resource) => {
            set((state) => ({ entries: without(state.entries, resource) }));
        },
        trimActivity: () => {
            const kept = activityKept.getState().entries;

            set((state) => ({
                entries: Object.fromEntries(
                    Object.entries(state.entries).map(([resource, buffer]) => [
                        resource,
                        buffer.length > kept ? trimmed(buffer) : buffer,
                    ]),
                ),
            }));
        },
        setNarrowing: (resource, narrowing) => {
            set((state) => ({
                narrowings: { ...state.narrowings, [resource]: narrowing },
            }));
        },
        reset: () => {
            set(initialActivitySlice());
        },
    };
}

export function createActivityStore(): ActivityStoreApi {
    return createStore<ActivityStore>()((set) => ({
        ...initialActivitySlice(),
        ...actionsFor(set),
    }));
}

export const activityStore = scopeToOrigin(createActivityStore());
