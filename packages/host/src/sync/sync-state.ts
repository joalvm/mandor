import type { OriginSyncState } from '@mandor/schema';

const states = new Map<string, OriginSyncState>();
const listeners = new Set<(root: string, state: OriginSyncState) => void>();

/**
 * Keeps where the synchronization of a repo stands and tells the listeners when it changes. The
 * same state said twice is said once: a window has no use for a push that tells it nothing.
 */
export function setSyncState(root: string, state: OriginSyncState): void {
    const before = states.get(root);

    if (before?.state === state.state && before.busy === state.busy) {
        return;
    }

    states.set(root, state);

    for (const listener of listeners) {
        listener(root, state);
    }
}

/** The state last set for the repo, or nothing when no loop has said anything about it. */
export function syncStateOf(root: string): OriginSyncState | null {
    return states.get(root) ?? null;
}

/** Forgets the repo: the origin it belonged to is no longer the one the window works in. */
export function forgetSyncState(root: string): void {
    states.delete(root);
}

/** Hears every change of state, with the repo it happened in. Answers how to stop hearing. */
export function onSyncStateChanged(
    listener: (root: string, state: OriginSyncState) => void,
): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}
