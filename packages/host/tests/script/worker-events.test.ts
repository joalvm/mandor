import { afterEach, describe, expect, it } from 'vitest';

import { failureOf, listen, type Listeners } from '../../src/script/worker-events.js';

import { spawn, terminateAll } from './fixtures/worker-runs.js';

afterEach(terminateAll);

const KINDS = ['message', 'messageerror', 'error', 'exit'] as const;

function noListeners(): Listeners {
    return {
        message: () => undefined,
        messageerror: () => undefined,
        error: () => undefined,
        exit: () => undefined,
    };
}

describe('the failure of a worker', () => {
    it('says the worker ran out of memory when its heap burst', () => {
        const error = Object.assign(new Error('heap'), { code: 'ERR_WORKER_OUT_OF_MEMORY' });

        expect(failureOf(error)).toEqual({
            errorName: 'WorkerOutOfMemory',
            message: 'The script worker ran out of memory',
        });
    });

    it('keeps the message of any other error, as a death of the worker', () => {
        expect(failureOf(new Error('gone'))).toEqual({ errorName: 'WorkerDied', message: 'gone' });
    });
});

describe('the listeners of a run', () => {
    it('go on the worker and come off it, one of each kind', () => {
        const worker = spawn();
        const listeners = noListeners();
        const counts = (): number[] => KINDS.map((kind) => worker.listenerCount(kind));
        const before = counts();

        listen(worker, listeners, 'on');

        expect(counts()).toEqual(before.map((count) => count + 1));

        listen(worker, listeners, 'off');

        expect(counts()).toEqual(before);
    });
});
