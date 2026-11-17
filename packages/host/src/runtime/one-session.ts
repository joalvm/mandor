/** The window of an app and all that lives with it, opened and closed as one. */
export type OneSession<Session> = {
    /** Opens a session unless one is open or on its way, and settles when it is up. */
    open: () => Promise<void>;
    /** Closes the open session, if there is one. */
    close: () => void;
    /** The open session, or null between closing the last window and opening the next. */
    current: () => Session | null;
};

/**
 * Keeps at most one session of the app alive. macOS leaves an app running after its last
 * window closes and brings a window back from the dock, so a session can close and open again
 * many times in one run; a second request while one is on its way joins it, and one that
 * failed leaves the way open to try again.
 */
export function createOneSession<Session>(
    start: () => Promise<Session>,
    stop: (session: Session) => void,
): OneSession<Session> {
    let current: Session | null = null;
    let opening: Promise<void> | null = null;

    return {
        open: () => {
            if (current !== null) {
                return Promise.resolve();
            }

            opening ??= start()
                .then((session) => {
                    current = session;
                })
                .finally(() => {
                    opening = null;
                });

            return opening;
        },
        close: () => {
            const closing = current;

            current = null;

            if (closing !== null) {
                stop(closing);
            }
        },
        current: () => current,
    };
}
