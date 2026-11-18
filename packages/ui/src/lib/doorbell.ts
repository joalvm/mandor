/** A ring one part of the window sends and the parts listening at that moment hear. */
export type Doorbell<T> = {
    ring: (detail: T) => void;
    /** Starts hearing the rings and returns the way out. */
    listen: (handler: (detail: T) => void) => () => void;
};

/**
 * A doorbell between two parts of one window that cannot import each other: a menu line that
 * closes the moment it is chosen rings, and a dialog the app keeps mounted answers. A ring is
 * heard by the listeners there when it rang, the way the window hands out its own events.
 */
export function createDoorbell<T>(): Doorbell<T> {
    const listeners = new Set<(detail: T) => void>();

    return {
        ring(detail) {
            for (const listener of [...listeners]) {
                listener(detail);
            }
        },
        listen(handler) {
            // Each listen is its own listener, so a handler that listens twice hears twice.
            function listener(detail: T): void {
                handler(detail);
            }

            listeners.add(listener);

            return () => {
                listeners.delete(listener);
            };
        },
    };
}
