import { EventEmitter } from 'node:events';
import type { Worker } from 'node:worker_threads';

import { SCRIPT_LIMITS, type WorkerMessage } from '@mandor/script';
import { newEngine } from '@mandor/script/engine';

import { serveScripts } from '../script/serve-scripts.js';
import {
    startScriptWorker,
    type ScriptChain,
    type ScriptChainOptions,
} from '../script/start-script-worker.js';
import { newWorkerSlots, type WorkerSlots } from '../script/worker-slots.js';

type InProcessWorker = EventEmitter & {
    alive: boolean;
    postMessage(message: WorkerMessage): void;
    terminate(): Promise<number>;
};

/**
 * A worker of scripts with no thread: the server of the worker and the real engine, in the
 * process of the test, over two ends that hand each message on a turn later, as a port does.
 */
function inProcessWorker(): InProcessWorker {
    const inside = new EventEmitter();
    const worker: InProcessWorker = Object.assign(new EventEmitter(), {
        alive: true,
        postMessage(message: WorkerMessage) {
            setImmediate(() => {
                if (worker.alive) {
                    inside.emit('message', message);
                }
            });
        },
        terminate() {
            if (worker.alive) {
                worker.alive = false;
                setImmediate(() => worker.emit('exit', 1));
            }

            return Promise.resolve(1);
        },
    });

    serveScripts({
        port: {
            on: (event, listener) => inside.on(event, listener),
            postMessage: (message) => {
                setImmediate(() => {
                    if (worker.alive) {
                        worker.emit('message', message);
                    }
                });
            },
        },
        engine: newEngine(),
        // A real worker that exits has posted its last message first; this one waits its turn too.
        exit: () => {
            setImmediate(() => void worker.terminate());
        },
    });

    return worker;
}

/**
 * The same contract as `startScriptWorker`, with the real engine and no thread: under vitest
 * there is no bundle for a worker to load. Only tests use it; closing the chain ends its worker.
 */
export function startInProcessScriptWorker(options: ScriptChainOptions = {}): ScriptChain {
    const slots = newWorkerSlots<InProcessWorker>({
        create: inProcessWorker,
        limit: 1,
        idleMs: SCRIPT_LIMITS.workerIdleMs,
        isAlive: (worker) => worker.alive,
    });
    // The double has what a run of `startScriptWorker` touches of a `Worker`, and nothing more.
    const chain = startScriptWorker(slots as unknown as WorkerSlots<Worker>, options);

    return {
        run: (input, signal) => chain.run(input, signal),
        close() {
            chain.close();
            slots.close();
        },
    };
}
