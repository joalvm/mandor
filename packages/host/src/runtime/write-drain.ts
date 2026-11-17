const pending = new Set<Promise<unknown>>();

/**
 * Keeps every write of the host reachable while it is in the air — the arrangement of the
 * window, the edits of a connection, whatever lands on disk on the way out.
 *
 * The window hands its state over on the way out, and a write that started is not a write that
 * landed: the process that would finish it is the same one being asked to exit. Held here, the
 * exit can wait for it, and the file on disk is the one the user closed, not the one from
 * before the last thing they did.
 */
export function trackWrite<T>(write: Promise<T>): Promise<T> {
    const done = write.finally(() => {
        pending.delete(done);
    });

    pending.add(done);

    return done;
}

/** Waits for what is being written, including whatever arrived while it was waiting. */
export async function writesSettled(): Promise<void> {
    while (pending.size > 0) {
        await Promise.allSettled([...pending]);
    }
}
