import type { WorkerMessage } from '@mandor/script';

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

/**
 * What a run touches of a worker: the events main listens to, and the messages it sends. A
 * `Worker` of the app, or a worker with no thread in a test.
 */
export type RunWorker = {
    on(event: keyof Listeners, listener: Listeners[keyof Listeners]): unknown;
    off(event: keyof Listeners, listener: Listeners[keyof Listeners]): unknown;
    postMessage(message: WorkerMessage): void;
};

/** Puts the listeners on the worker, or takes them off. */
export function listen(worker: RunWorker, listeners: Listeners, method: 'on' | 'off'): void {
    worker[method]('message', listeners.message);
    worker[method]('messageerror', listeners.messageerror);
    worker[method]('error', listeners.error);
    worker[method]('exit', listeners.exit);
}
