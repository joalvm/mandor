import { createStore } from 'zustand/vanilla';

/** Entries each connection keeps until the settings say: the count they start at. */
export const ACTIVITY_KEPT_AT_FIRST = 500;

type ActivityKept = {
    /** How many entries each resource keeps; past it the oldest leave the list. */
    entries: number;
};

/**
 * How many entries of activity the person chose to keep per connection. It is a setting of the
 * window, not of what one origin holds, so leaving an origin keeps it.
 */
// store-scope: window — a setting of the window outlives every origin the window opens
export const activityKept = createStore<ActivityKept>()(() => ({
    entries: ACTIVITY_KEPT_AT_FIRST,
}));
