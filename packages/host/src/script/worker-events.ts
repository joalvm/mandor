import type { Worker } from 'node:worker_threads';

/** How a worker that threw on its own ended: out of memory, or dead for another reason. */
export function failureOf(error: Error): { errorName: string; message: string } {
    const lost = 'code' in error && error.code === 'ERR_WORKER_OUT_OF_MEMORY';

    return {
        errorName: lost ? 'WorkerOutOfMemory' : 'WorkerDied',
        message: lost ? 'The script worker ran out of memory' : error.message,
    };
}

/** What main listens to on a worker while a run is on it. */
export type Listeners = {
    message: (value: unknown) => void;
    messageerror: () => void;
    error: (error: Error) => void;
    exit: (code: number) => void;
};

/** Puts the listeners on the worker, or takes them off. */
export function listen(worker: Worker, listeners: Listeners, method: 'on' | 'off'): void {
    worker[method]('message', listeners.message);
    worker[method]('messageerror', listeners.messageerror);
    worker[method]('error', listeners.error);
    worker[method]('exit', listeners.exit);
}
