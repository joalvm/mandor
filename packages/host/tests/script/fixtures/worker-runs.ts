import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import { runOnWorker, type Finished, type RunSettings } from '../../../src/script/run-on-worker.js';

const FIXTURE = fileURLToPath(new URL('./scripted-script-worker.mjs', import.meta.url));

export const BASE: RunSettings = {
    startMs: 5_000,
    runMs: 5_000,
    slackMs: 0,
    outputBytes: 1024 * 1024,
};
const workers: Worker[] = [];

/** Ends the workers a test spawned. */
export async function terminateAll(): Promise<void> {
    await Promise.all(workers.splice(0).map((worker) => worker.terminate()));
}

export function spawn(): Worker {
    const worker = new Worker(FIXTURE, {
        env: {},
        execArgv: [],
        resourceLimits: { maxOldGenerationSizeMb: 32, maxYoungGenerationSizeMb: 8, stackSizeMb: 4 },
    });

    worker.on('error', () => undefined);
    workers.push(worker);

    return worker;
}

export function run(
    input: string,
    settings: Partial<RunSettings> = {},
    signal: AbortSignal = new AbortController().signal,
): Promise<Finished> {
    return runOnWorker(spawn(), input, signal, { ...BASE, ...settings });
}

/** The input of a run of `event` that makes the worker of the fixture do `behavior`. */
export function asking(behavior: string, event = 'onBeforeRequest'): string {
    return JSON.stringify({ event, behavior });
}

export function failure(finished: Finished): { errorName: string; message: string } {
    if (finished.outcome.ok) {
        throw new Error('the run was expected to fail');
    }

    return finished.outcome.error;
}
