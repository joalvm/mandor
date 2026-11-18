import type { OriginSyncStateName } from '@mandor/schema';

import type { StoredOrigin } from '../origin/stored-origin.js';
import { onCommitted } from '../repo/commit-events.js';
import { forgetSyncState, setSyncState, syncStateOf } from './sync-state.js';

/** When the loop looks on its own, and how it waits to try again after a failure. */
export type SyncLoopTiming = {
    intervalMs: number;
    retryStartMs: number;
    retryMaxMs: number;
};

const DEFAULT_TIMING: SyncLoopTiming = {
    intervalMs: 60_000,
    retryStartMs: 5_000,
    retryMaxMs: 60_000,
};

export type SyncLoop = {
    dispose: () => void;
    /** Asks for a step: now, or right after the one that is running. */
    request: () => void;
};

/**
 * Keeps one origin in step with its remote while the window works in it. A step runs when the
 * origin opens, after every commit, every `intervalMs` and whenever someone asks (the window
 * took the focus). Only one step runs at a time: a request that comes meanwhile makes one more
 * step when the running one ends, never two together. After a failure the loop tries again
 * after `retryStartMs`, doubling up to `retryMaxMs`, and starts over from a step that worked.
 *
 * The local origin has no remote: it is told `local-only` once and nothing runs.
 */
export function startSyncLoop(
    origin: Pick<StoredOrigin, 'root' | 'kind'>,
    step: () => Promise<OriginSyncStateName>,
    timing: SyncLoopTiming = DEFAULT_TIMING,
): SyncLoop {
    const { root } = origin;

    if (origin.kind === 'local') {
        setSyncState(root, { state: 'local-only', busy: false });

        return {
            dispose: () => {
                forgetSyncState(root);
            },
            request: () => undefined,
        };
    }

    let disposed = false;
    let running = false;
    let again = false;
    let retryMs = timing.retryStartMs;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const settle = (state: OriginSyncStateName): void => {
        // A failure waits twice as long as the last one, up to the ceiling; anything else starts over.
        const failed = state === 'error';

        retryMs = failed ? Math.min(retryMs * 2, timing.retryMaxMs) : timing.retryStartMs;
        setSyncState(root, { state, busy: false });
    };

    const run = async (): Promise<void> => {
        running = true;
        setSyncState(root, { state: syncStateOf(root)?.state ?? 'clean', busy: true });

        const state = await step().catch((): OriginSyncStateName => 'error');

        running = false;

        if (disposed) {
            return;
        }

        const failedBefore = retryMs;

        settle(state);

        if (state === 'error') {
            retryTimer = setTimeout(request, failedBefore);
        }

        if (again) {
            again = false;
            request();
        }
    };

    function request(): void {
        if (disposed) {
            return;
        }

        if (retryTimer !== null) {
            clearTimeout(retryTimer);
            retryTimer = null;
        }

        if (running) {
            again = true;

            return;
        }

        void run();
    }

    const stopCommits = onCommitted((committed) => {
        if (committed === root) {
            request();
        }
    });
    const interval = setInterval(request, timing.intervalMs);

    request();

    return {
        dispose: () => {
            disposed = true;
            clearInterval(interval);
            stopCommits();

            if (retryTimer !== null) {
                clearTimeout(retryTimer);
            }

            forgetSyncState(root);
        },
        request,
    };
}
