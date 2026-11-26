/** Sends kept per workspace until the window says otherwise; the settings start at the same. */
export const HISTORY_MAX_ENTRIES = 500;

/** Days a send is kept until the window says otherwise; the settings start at the same. */
export const HISTORY_MAX_AGE_DAYS = 30;

/**
 * Bytes the stored bodies of a workspace's sends may hold. Past it the oldest sends that stored a
 * body go, so a download repeated with other bytes each time cannot fill the disk; the sends whose
 * bodies stayed in their file are kept.
 */
const HISTORY_MAX_BODY_BYTES = 1024 * 1024 * 1024;

/**
 * A body of a send stays inside its file up to this size and goes to the store of bodies past
 * it, so listing 500 entries reads 32 MiB at most and never the 1 GiB a response may have been.
 */
export const HISTORY_INLINE_BYTES = 64 * 1024;

/** What a prune holds one workspace to: how many sends, how old, and what their bodies weigh. */
export type PruneLimits = { maxEntries: number; maxAgeDays: number; maxBodyBytes: number };

export const DEFAULT_PRUNE_LIMITS: PruneLimits = {
    maxEntries: HISTORY_MAX_ENTRIES,
    maxAgeDays: HISTORY_MAX_AGE_DAYS,
    maxBodyBytes: HISTORY_MAX_BODY_BYTES,
};
