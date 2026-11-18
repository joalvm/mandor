import { Worker } from 'node:worker_threads';

import { SCRIPT_LIMITS } from '@mandor/script';

import { runOnWorker, type RunSettings, type ScriptOutcome } from './run-on-worker.js';
import { newWorkerSlots, type WorkerSlots } from './worker-slots.js';

/** What a worker may use of the heap. The WASM memory is outside it and has its own maximum. */
const WORKER_LIMITS = { maxOldGenerationSizeMb: 32, maxYoungGenerationSizeMb: 8, stackSizeMb: 4 };

/** Main waits this long past the time of the script for the worker to hand over its `done`. */
const RUN_SLACK_MS = 1_000;

/** How long a worker may take to begin a script: a new one loads and compiles the engine first. */
const START_MS = 10_000;

export type ScriptSlotsOptions = {
    /** The most workers of the app alive at once. */
    limit?: number;
    /** How long a worker waits for a script before it is closed. */
    idleMs?: number;
};

/**
 * The workers of scripts of an app, shared by every chain: at most `workers` alive, parked between
 * scripts and closed when idle. A worker starts with an empty environment and no flags of main.
 */
export function newScriptSlots(
    workerPath: string,
    options: ScriptSlotsOptions = {},
): WorkerSlots<Worker> {
    const { limit = SCRIPT_LIMITS.workers, idleMs = SCRIPT_LIMITS.workerIdleMs } = options;

    return newWorkerSlots<Worker>({
        create: () => {
            const worker = new Worker(workerPath, {
                env: {},
                execArgv: [],
                resourceLimits: WORKER_LIMITS,
            });

            // A worker that dies while parked has nobody listening: without this, it would throw in main.
            worker.on('error', () => undefined);
            worker.unref();

            return worker;
        },
        limit,
        idleMs,
        isAlive: (worker) => worker.threadId !== -1,
    });
}

export type ScriptChainOptions = {
    /** Answers a `send` of the guest; without it a script that sends is cut. */
    onSend?: RunSettings['onSend'] | undefined;
    /** The time of one script. */
    runMs?: number;
    /** What main adds to it before it cuts the worker. */
    slackMs?: number;
};

/**
 * The scripts of one caller. Each run takes a worker of its own, so runs started together go side
 * by side; a caller that needs them in order waits for each before the next.
 */
export type ScriptChain = {
    /** Never rejects: a cut, a death, a cancel and a throw of the script all come back as an outcome. */
    run(input: string, signal?: AbortSignal): Promise<ScriptOutcome>;
    /** Cancels the run in flight and refuses what comes after. */
    close(): void;
};

function failed(errorName: string, message: string): ScriptOutcome {
    return { ok: false, error: { message, errorName } };
}

/**
 * The chain of a caller over the workers of the app. Each script takes a worker (a parked one, a
 * new one under the limit, or the next to be free), runs on it and gives it back: to be reused if
 * the script ended clean, ended if it threw a fault, broke the protocol, hung, died or was cancelled.
 */
export function startScriptWorker(
    slots: WorkerSlots<Worker>,
    options: ScriptChainOptions = {},
): ScriptChain {
    const closing = new AbortController();
    const settings: RunSettings = {
        startMs: START_MS,
        runMs: options.runMs ?? SCRIPT_LIMITS.runMs,
        slackMs: options.slackMs ?? RUN_SLACK_MS,
        outputBytes: SCRIPT_LIMITS.outputBytes,
        onSend: options.onSend,
    };

    async function run(input: string, signal?: AbortSignal): Promise<ScriptOutcome> {
        const wait =
            signal === undefined ? closing.signal : AbortSignal.any([signal, closing.signal]);
        let worker: Worker;

        try {
            worker = await slots.acquire(wait);
        } catch {
            return wait.aborted
                ? failed('Cancelled', 'The run was cancelled')
                : failed('Closed', 'The script workers are closed');
        }

        const { outcome, reuse } = await runOnWorker(worker, input, wait, settings);

        slots.release(worker, { reuse });

        return outcome;
    }

    return {
        run,
        close() {
            closing.abort();
        },
    };
}
