import type { OriginSyncStateName } from '@mandor/schema';

import type { SyncLoopTiming } from '../../src/sync/sync-loop.js';

export const ROOT = '/repo/loop';

export const TIMING: SyncLoopTiming = {
    intervalMs: 60_000,
    retryStartMs: 5_000,
    retryMaxMs: 20_000,
};

export function remote(): { root: string; kind: 'remote' } {
    return { root: ROOT, kind: 'remote' };
}

export type Gate = {
    step: () => Promise<OriginSyncStateName>;
    open: (state: OriginSyncStateName) => void;
};

/** A step that stays running until the test says how it ends: a step that takes its time. */
export function gated(): Gate {
    let release: (state: OriginSyncStateName) => void = () => undefined;

    return {
        step: () =>
            new Promise((resolve) => {
                release = resolve;
            }),
        open: (state) => {
            release(state);
        },
    };
}
