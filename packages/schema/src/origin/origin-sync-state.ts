import { z } from 'zod';

/**
 * Where an origin stands against its remote. `local-only` has no remote to stand against;
 * `ahead` and `behind` are transient, for a step that has told what it found and not yet acted;
 * `diverged` is each side with work the other lacks; `conflict` is a clash waiting for a person.
 */
export const ORIGIN_SYNC_STATES = [
    'local-only',
    'clean',
    'ahead',
    'behind',
    'diverged',
    'conflict',
    'error',
] as const;

export type OriginSyncStateName = (typeof ORIGIN_SYNC_STATES)[number];

/** What a window knows of the synchronization of the open origin: where it stands and if it works. */
export const originSyncStateSchema = z
    .object({
        state: z.enum(ORIGIN_SYNC_STATES),
        busy: z.boolean(),
    })
    .strict();

export type OriginSyncState = z.infer<typeof originSyncStateSchema>;
