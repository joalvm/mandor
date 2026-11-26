import type { HistoryConfigureRequest } from '@mandor/ipc';

import { DEFAULT_PRUNE_LIMITS, type PruneLimits } from './history-limits.js';

/**
 * How much of the past the history keeps, as the person last chose it in the window: the count
 * and the age are theirs, the weight of the bodies is not. Until the window says, it keeps what the
 * settings start at.
 */
export type HistoryRetention = {
    /** The limits the next prune applies. */
    limits: () => PruneLimits;
    /** Takes what the window chose, for every prune from now on. */
    choose: (choice: HistoryConfigureRequest) => void;
};

export function createHistoryRetention(): HistoryRetention {
    let limits = DEFAULT_PRUNE_LIMITS;

    return {
        limits: () => limits,
        choose: (choice) => {
            limits = { ...limits, ...choice };
        },
    };
}
