import { Worker } from 'node:worker_threads';

import { FormatInputError, type InteropRead } from '@mandor/interop-core';

import { ImportCancelledError } from './import-cancelled-error.js';
import type { ImportReadReply, ImportReadRequest } from './import-worker-message.js';
import type { ReadImport } from './read-import.js';

/** How long a read may take and how much memory it may hold before main ends it. */
export type WorkerLimits = { timeMs: number; memoryMb: number };

/**
 * Generous for a real document: the largest public specifications read in a few seconds and a
 * few hundred megabytes. What passes them is a document built to hang or swell its parser.
 */
export const WORKER_LIMITS: WorkerLimits = { timeMs: 60_000, memoryMb: 1024 };

const OUT_OF_MEMORY = 'ERR_WORKER_OUT_OF_MEMORY';

/**
 * Reads every import in a worker of its own, so a document can never stop main. A shared file
 * chooses what the parser runs: a `pattern` that backtracks without end, or references that
 * multiply on each level. On a thread of their own they hit a clock and a ceiling of memory,
 * and the import is refused with that reason while the windows keep answering.
 */
export function readerInWorker(script: string, limits: WorkerLimits = WORKER_LIMITS): ReadImport {
    return (format, files, scope, signal) =>
        readOnce(script, limits, { formatId: format.id, files: [...files], scope }, signal);
}

async function readOnce(
    script: string,
    limits: WorkerLimits,
    request: ImportReadRequest,
    signal?: AbortSignal,
): Promise<InteropRead> {
    const worker = new Worker(script, {
        resourceLimits: { maxOldGenerationSizeMb: limits.memoryMb },
    });
    let timer: NodeJS.Timeout | undefined;

    try {
        return await new Promise<InteropRead>((resolve, reject) => {
            timer = setTimeout(() => {
                reject(
                    new FormatInputError([
                        `the document took longer than ${secondsOf(limits)} s to read`,
                    ]),
                );
            }, limits.timeMs);
            signal?.addEventListener('abort', () => {
                reject(new ImportCancelledError());
            });
            worker.once('message', (reply: ImportReadReply) => {
                settle(reply, { resolve, reject });
            });
            worker.once('error', (error: Error) => {
                reject(workerFault(error));
            });
            worker.once('exit', () => {
                reject(new Error('the import worker stopped before it answered'));
            });
            worker.postMessage(request);
        });
    } finally {
        clearTimeout(timer);
        void worker.terminate();
    }
}

function secondsOf(limits: WorkerLimits): string {
    return String(Math.round(limits.timeMs / 1000));
}

type Settlers = { resolve: (read: InteropRead) => void; reject: (error: Error) => void };

/** How each answer of the worker ends the read: the refusal of a format stays one in main. */
const SETTLE: {
    [K in ImportReadReply['kind']]: (
        reply: Extract<ImportReadReply, { kind: K }>,
        to: Settlers,
    ) => void;
} = {
    read: (reply, to) => {
        to.resolve(reply.read);
    },
    refused: (reply, to) => {
        to.reject(new FormatInputError(reply.problems));
    },
    failed: (reply, to) => {
        to.reject(new Error(reply.message));
    },
};

function settle(reply: ImportReadReply, to: Settlers): void {
    (SETTLE[reply.kind] as (reply: ImportReadReply, to: Settlers) => void)(reply, to);
}

/** Running out of memory is the document's doing; any other fault of the worker is the app's. */
function workerFault(error: Error): Error {
    if ('code' in error && error.code === OUT_OF_MEMORY) {
        return new FormatInputError(['the document needs more memory than an import may take']);
    }

    return error;
}
