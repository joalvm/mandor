import { scriptErrorSchema } from '@mandor/schema';
import { z } from 'zod';

const id = z.string().min(1);

/**
 * Why the instance of the worker can no longer be trusted: the script used its time, its memory,
 * or the WASM trapped. The worker is thrown away after any of them, and a script that merely
 * throws is none.
 */
const fault = z.enum(['timeout', 'memory', 'trap']);

export type EngineFault = z.infer<typeof fault>;

/**
 * What main and the worker of scripts say to each other. Both sides parse every message, and each
 * kind carries the `runId` of the run it belongs to: a message of another run is a violation of
 * the protocol. `input` and `output` are opaque text here; their shape is the one of the script
 * API, which the engine reads and writes.
 *
 * - `run` (to the worker): run this input.
 * - `started` (from the worker): the engine is ready and the script begins. The time of the
 *   script counts from here, so the start of a new worker is not time of the script.
 * - `waiting` (from the worker): the guest waits for the answer of a `send` it made.
 * - `send` (from the worker): the guest asks main to send something, and main decides.
 * - `sent` (to the worker): the answer main gives to a `send`.
 * - `done` (from the worker): the run ended with its output.
 * - `failed` (from the worker): the run ended with the error that ended it, and the fault of the
 *   instance when there is one.
 */
export const workerMessageSchema = z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('run'), runId: id, input: z.string() }),
    z.strictObject({ kind: z.literal('started'), runId: id }),
    z.strictObject({ kind: z.literal('waiting'), runId: id }),
    z.strictObject({ kind: z.literal('send'), runId: id, sendId: id, payload: z.string() }),
    z.strictObject({ kind: z.literal('sent'), runId: id, sendId: id, reply: z.string() }),
    z.strictObject({ kind: z.literal('done'), runId: id, output: z.string() }),
    z.strictObject({
        kind: z.literal('failed'),
        runId: id,
        error: scriptErrorSchema,
        fault: fault.optional(),
    }),
]);

export type WorkerMessage = z.infer<typeof workerMessageSchema>;

/** An answer of main to a send of the guest, as text. */
export type SendAnswer = { sendId: string; reply: string };

/**
 * How the engine talks to main while a script waits. The three are the messages of the worker
 * protocol: `send` and `waiting` go out, and the answer of main comes back as `sent`.
 */
export type SendLink = {
    send: (sendId: string, payload: string) => void;
    waiting: () => void;
    nextAnswer: () => Promise<SendAnswer>;
};
