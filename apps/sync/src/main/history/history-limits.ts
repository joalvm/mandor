/** Sends kept per workspace; past it the oldest go when the next one is written. */
export const HISTORY_MAX_ENTRIES = 500;

/** Days a send is kept; the spec says «configurable», and today it is a constant. */
export const HISTORY_MAX_AGE_DAYS = 30;

/**
 * Bytes the stored bodies of a workspace's sends may hold. Past it the oldest sends that stored a
 * body go, so a download repeated with other bytes each time cannot fill the disk; the sends whose
 * bodies stayed in their file are kept.
 */
export const HISTORY_MAX_BODY_BYTES = 1024 * 1024 * 1024;

/**
 * A body of a send stays inside its file up to this size and goes to the store of bodies past
 * it, so listing 500 entries reads 32 MiB at most and never the 1 GiB a response may have been.
 */
export const HISTORY_INLINE_BYTES = 64 * 1024;
