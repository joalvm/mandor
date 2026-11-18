/** Anything the slots can end: a `Worker`, or a double with the same `terminate`. */
export type Terminable = { terminate(): unknown };

export type WorkerSlotsOptions<W extends Terminable> = {
    /** Makes a worker. The slots count it from then on. */
    create: () => W;
    /** The most workers alive at once, busy and parked together. */
    limit: number;
    /** How long a parked worker waits for a script before it is closed. */
    idleMs: number;
    /** Whether a worker still runs; a parked one that does not is ended instead of served. */
    isAlive?: (worker: W) => boolean;
};

export type WorkerSlots<W> = {
    /** A parked worker, a new one under the limit, or the next free one in order of arrival. */
    acquire(signal?: AbortSignal): Promise<W>;
    /** Gives a worker back: parked for the next script, or ended if it is not to be reused. */
    release(worker: W, options: { reuse: boolean }): void;
    /** Ends every parked worker and refuses what comes after. */
    close(): void;
};

type Waiter<W> = { resolve: (worker: W) => void; reject: (reason: Error) => void };

function cancelled(reason: unknown): Error {
    return new Error('The wait for a worker was cancelled', { cause: reason });
}

/**
 * The workers of a window: parked between scripts, closed when idle, never more than the limit.
 * Which worker runs which script is not decided here, only how many exist and who waits for one.
 */
export function newWorkerSlots<W extends Terminable>(
    options: WorkerSlotsOptions<W>,
): WorkerSlots<W> {
    const { create, limit, idleMs, isAlive = () => true } = options;
    const parked = new Map<W, NodeJS.Timeout>();
    const waiters: Waiter<W>[] = [];
    let total = 0;
    let closed = false;

    function discard(worker: W): void {
        total -= 1;
        void worker.terminate();
    }

    function open(): W {
        const worker = create();

        total += 1;

        return worker;
    }

    function takeParked(): W | undefined {
        for (const [worker, timer] of parked) {
            parked.delete(worker);
            clearTimeout(timer);

            if (isAlive(worker)) {
                return worker;
            }

            discard(worker);
        }

        return undefined;
    }

    function park(worker: W): void {
        const timer = setTimeout(() => {
            parked.delete(worker);
            discard(worker);
        }, idleMs);

        timer.unref();
        parked.set(worker, timer);
    }

    function handOver(worker: W): boolean {
        const waiter = waiters.shift();

        waiter?.resolve(worker);

        return waiter !== undefined;
    }

    function enqueue(signal?: AbortSignal): Promise<W> {
        return new Promise<W>((resolve, reject) => {
            // However the wait ends, it stops listening to the signal: a long-lived one keeps no
            // waiter of a closed set of slots alive.
            const waiter: Waiter<W> = {
                resolve: (worker) => {
                    signal?.removeEventListener('abort', leave);
                    resolve(worker);
                },
                reject: (reason) => {
                    signal?.removeEventListener('abort', leave);
                    reject(reason);
                },
            };

            function leave(): void {
                waiters.splice(waiters.indexOf(waiter), 1);
                reject(cancelled(signal?.reason));
            }

            waiters.push(waiter);
            signal?.addEventListener('abort', leave, { once: true });
        });
    }

    function endAndRefill(worker: W): void {
        discard(worker);

        if (waiters.length > 0 && total < limit) {
            handOver(open());
        }
    }

    return {
        acquire(signal) {
            if (closed) {
                return Promise.reject(new Error('The worker slots are closed'));
            }

            if (signal?.aborted) {
                return Promise.reject(cancelled(signal.reason));
            }

            const worker = takeParked() ?? (total < limit ? open() : undefined);

            return worker === undefined ? enqueue(signal) : Promise.resolve(worker);
        },
        release(worker, { reuse }) {
            if (closed || !reuse || !isAlive(worker)) {
                endAndRefill(worker);

                return;
            }

            if (!handOver(worker)) {
                park(worker);
            }
        },
        close() {
            closed = true;

            for (const waiter of waiters.splice(0)) {
                waiter.reject(new Error('The worker slots are closed'));
            }

            for (const [worker, timer] of parked) {
                clearTimeout(timer);
                discard(worker);
            }

            parked.clear();
        },
    };
}
