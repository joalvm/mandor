export type GuestClock = {
    /** Runs `work` and counts its time as time of the guest. */
    measure<T>(work: () => T): T;
    /** For the interrupt handler of the runtime: true once the guest has used up its time. */
    interrupt(): boolean;
    readonly exceeded: boolean;
};

/**
 * The time a script has run, and only that. The deadline of `shouldInterruptAfterDeadline` is an
 * absolute `Date.now()`, so it would count the wait for a network answer as time of the script.
 * Here only the stretches wrapped in `measure` count: the guest runs inside them and nowhere else.
 */
export function newGuestClock(
    limitMs: number,
    now: () => number = () => performance.now(),
): GuestClock {
    let spent = 0;
    let started: number | undefined;
    let over = false;

    function elapsed(): number {
        return started === undefined ? spent : spent + now() - started;
    }

    return {
        measure(work) {
            started = now();

            try {
                return work();
            } finally {
                spent += now() - started;
                started = undefined;
            }
        },
        interrupt() {
            over = over || elapsed() > limitMs;

            return over;
        },
        get exceeded() {
            return over;
        },
    };
}
