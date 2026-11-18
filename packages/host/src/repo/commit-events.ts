const committedListeners = new Set<(root: string) => void>();
const failedListeners = new Set<(root: string, error: unknown) => void>();

/** Hears every commit that landed, with the repo it landed in. Answers how to stop hearing. */
export function onCommitted(listener: (root: string) => void): () => void {
    committedListeners.add(listener);

    return () => {
        committedListeners.delete(listener);
    };
}

/** Hears every commit git refused. The paths stay waiting: this is for the log, not for retry. */
export function onCommitFailed(listener: (root: string, error: unknown) => void): () => void {
    failedListeners.add(listener);

    return () => {
        failedListeners.delete(listener);
    };
}

/** Tells the listeners a commit landed, whoever made it: the scheduler or a change of shape. */
export function announceCommitted(root: string): void {
    for (const listener of committedListeners) {
        listener(root);
    }
}

export function announceCommitFailed(root: string, error: unknown): void {
    for (const listener of failedListeners) {
        listener(root, error);
    }
}
