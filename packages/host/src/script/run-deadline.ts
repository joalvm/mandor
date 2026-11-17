/** The time main gives one run, which stops while the guest waits for the network. */
export type RunDeadline = {
    /** Stops the count; what was spent stays spent. Does nothing if it is stopped already. */
    pause(): void;
    /** Goes on from what is left. Does nothing if it is running, or was cleared. */
    resume(): void;
    /** Drops the deadline for good; it never fires after this. */
    clear(): void;
};

/**
 * Calls `onExpire` once `ms` of running time pass. The run is waiting on a request main made
 * for it for as long as it is paused, and that wait has its own limit, so it does not count here.
 */
export function startRunDeadline(ms: number, onExpire: () => void): RunDeadline {
    let left = ms;
    let startedAt = performance.now();
    let timer: NodeJS.Timeout | undefined;
    let cleared = false;

    function arm(): void {
        startedAt = performance.now();
        timer = setTimeout(() => {
            timer = undefined;
            cleared = true;
            onExpire();
        }, left);
    }

    arm();

    return {
        pause() {
            if (timer === undefined) {
                return;
            }

            clearTimeout(timer);
            timer = undefined;
            left = Math.max(0, left - (performance.now() - startedAt));
        },
        resume() {
            if (timer === undefined && !cleared) {
                arm();
            }
        },
        clear() {
            cleared = true;
            clearTimeout(timer);
            timer = undefined;
        },
    };
}
