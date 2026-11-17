import { parentPort } from 'node:worker_threads';

import {
    SCRIPT_LIMITS,
    scriptRunInputSchema,
    workerMessageSchema,
    type ScriptRunInput,
    type WorkerMessage,
} from '@mandor/script';
import { newEngine, type Engine } from '@mandor/script/engine';

import { newScriptLink, type ScriptLink } from './script-link.js';

/** The side of the port the worker uses: what `parentPort` is, and what a test can double. */
export type ScriptPort = {
    on(event: 'message', listener: (value: unknown) => void): unknown;
    postMessage(message: WorkerMessage): void;
};

export type ScriptServerOptions = {
    /** Where main talks to this worker; `parentPort` by default. */
    port?: ScriptPort | null;
    /** The engine; one is made on start by default, and kept for every script of the worker. */
    engine?: Promise<Engine>;
    /** Ends the thread once an instance can no longer be trusted. */
    exit?: () => void;
};

type Ended = Extract<WorkerMessage, { kind: 'done' | 'failed' }>;

type Failed = Extract<WorkerMessage, { kind: 'failed' }>;

function endOf(runId: string, result: Awaited<ReturnType<Engine['runScript']>>): Ended {
    if (!result.ok) {
        return { kind: 'failed', runId, error: result.error, fault: result.fault };
    }

    const output = JSON.stringify(result.output);

    if (Buffer.byteLength(output) > SCRIPT_LIMITS.outputBytes) {
        return {
            kind: 'failed',
            runId,
            error: {
                message: `The output is bigger than ${String(SCRIPT_LIMITS.outputBytes)} bytes`,
                errorName: 'OutputTooLarge',
                limit: SCRIPT_LIMITS.outputBytes,
            },
        };
    }

    return { kind: 'done', runId, output };
}

/** The input of a run as main wrote it: JSON text of a `ScriptRunInput`, or nothing. */
function inputOf(text: string): ScriptRunInput | undefined {
    try {
        const parsed = scriptRunInputSchema.safeParse(JSON.parse(text));

        return parsed.success ? parsed.data : undefined;
    } catch {
        return undefined;
    }
}

const NOT_AN_INPUT: Failed['error'] = {
    message: 'The input of the run is not a valid input',
    errorName: 'InvalidInput',
};

function trapped(runId: string, cause: unknown): Failed {
    return {
        kind: 'failed',
        runId,
        error: { message: String(cause), errorName: 'EngineTrap' },
        fault: 'trap',
    };
}

/**
 * The body of the worker of scripts: it makes the engine once, then runs the scripts main sends
 * one at a time and answers each with a `done` or a `failed`. A script that sends talks to main through a link
 * of its run: the `sent` main answers with goes to it. A message that is not of the protocol is
 * ignored, and so is a `sent` for a run that is over: main is the one that judges the protocol.
 * Imported from the main thread it does nothing, since there is no parent to answer.
 */
export function serveScripts(options: ScriptServerOptions = {}): void {
    const port = options.port === undefined ? parentPort : options.port;

    if (port === null) {
        return;
    }

    const engine = options.engine ?? newEngine();
    const exit = options.exit ?? ((): void => process.exit(0));

    // The runs that wait for an answer of main, by the id of the run.
    const links = new Map<string, ScriptLink>();

    async function run(runId: string, input: string): Promise<void> {
        const own = newScriptLink(runId, { postMessage: (message) => port?.postMessage(message) });

        links.set(runId, own);

        try {
            const ready = await engine;

            port?.postMessage({ kind: 'started', runId });

            const parsed = inputOf(input);
            const ended: Ended =
                parsed === undefined
                    ? { kind: 'failed', runId, error: NOT_AN_INPUT }
                    : endOf(runId, await ready.runScript(parsed, own.link));

            port?.postMessage(ended);

            if (ended.kind === 'failed' && ended.fault !== undefined) {
                exit();
            }
        } catch (cause) {
            port?.postMessage(trapped(runId, cause));
            exit();
        } finally {
            links.delete(runId);
        }
    }

    // What the worker does with each kind main sends; the other kinds it ignores.
    const fromMain: {
        [K in WorkerMessage['kind']]?: (message: Extract<WorkerMessage, { kind: K }>) => void;
    } = {
        run: ({ runId, input }) => {
            void run(runId, input);
        },
        sent: ({ runId, sendId, reply }) => {
            links.get(runId)?.accept({ sendId, reply });
        },
    };

    port.on('message', (value) => {
        const message = workerMessageSchema.safeParse(value);

        if (message.success) {
            (fromMain[message.data.kind] as ((message: WorkerMessage) => void) | undefined)?.(
                message.data,
            );
        }
    });
}
