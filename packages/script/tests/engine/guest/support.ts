import type {
    ScriptRunInput,
    ScriptRunOutput,
    ScriptSnapshot,
} from '../../../src/contract/script-run.js';
import { runScript, type ScriptRunResult } from '../../../src/engine/run-script.js';
import type { SendAnswer, SendLink } from '../../../src/contract/worker-message.js';
import type { WasmModule } from '../../../src/engine/wasm-module.js';

/** The input of a run of `source` at a request, with a snapshot that holds what the test names. */
export function inputOf(source: string, snapshot: Partial<ScriptSnapshot> = {}): ScriptRunInput {
    return {
        event: 'onBeforeRequest',
        source,
        snapshot: {
            variables: [],
            info: { event: 'onBeforeRequest', name: 'a request' },
            ...snapshot,
        },
    };
}

/** The input of a run of `source` at `event`, with a snapshot that holds what the test names. */
function inputAt(
    event: ScriptRunInput['event'],
    source: string,
    snapshot: Partial<ScriptSnapshot> = {},
): ScriptRunInput {
    const input = inputOf(source, snapshot);

    return {
        ...input,
        event,
        snapshot: { ...input.snapshot, info: { ...input.snapshot.info, event } },
    };
}

/** The output of a run that came to an end: any fault fails the test. */
function outputIn(result: ScriptRunResult): ScriptRunOutput {
    if (!result.ok) {
        throw new Error(`fault ${result.fault}: ${result.error.message}`);
    }

    return result.output;
}

/** The output of a script of `event` that ran to the end of the engine: any fault fails the test. */
export async function outputAt(
    wasm: WasmModule,
    event: ScriptRunInput['event'],
    source: string,
    snapshot: Partial<ScriptSnapshot> = {},
): Promise<ScriptRunOutput> {
    return outputIn(await runScript(wasm, inputAt(event, source, snapshot)));
}

/** The output of a script that ran to the end of the engine: any fault fails the test. */
export async function outputOf(
    wasm: WasmModule,
    source: string,
    snapshot: Partial<ScriptSnapshot> = {},
): Promise<ScriptRunOutput> {
    return outputAt(wasm, 'onBeforeRequest', source, snapshot);
}

/** What a script wrote to the console, as lines of text; a notice of the API, as its code. */
export async function consoleOf(
    wasm: WasmModule,
    source: string,
    snapshot: Partial<ScriptSnapshot> = {},
): Promise<string[]> {
    return (await outputOf(wasm, source, snapshot)).logs.map((log) =>
        'text' in log ? log.text : log.notice,
    );
}

/** The text the script logs for `console.log(expression)`. */
export async function lineOf(wasm: WasmModule, expression: string): Promise<string> {
    return (await consoleOf(wasm, `console.log(${expression});`))[0] ?? '';
}

/** `name: message` of what the statement throws, or `no` when it does not. */
export async function thrownBy(wasm: WasmModule, statement: string): Promise<string> {
    return lineOf(
        wasm,
        `(() => { try { ${statement}; return "no"; } catch (e) { return e.name + ": " + e.message; } })()`,
    );
}

/** What `thrownBy` answers for a statement that holds. */
export const HOLDS = 'no';

/** What `thrownBy` answers for an assertion that fails with `message`. */
export function fails(message: string): string {
    return `AssertionError: ${message}`;
}

/** A link to main that answers each send with `answer(payload)`, and keeps what the guest said. */
export type RecordedLink = SendLink & {
    sent: { sendId: string; payload: string }[];
    waits: number;
};

export function answeringLink(answer: (payload: string) => string): RecordedLink {
    const queue: SendAnswer[] = [];
    const link: RecordedLink = {
        sent: [],
        waits: 0,
        send(sendId, payload) {
            link.sent.push({ sendId, payload });
            queue.push({ sendId, reply: answer(payload) });
        },
        waiting() {
            link.waits += 1;
        },
        nextAnswer() {
            const next = queue.shift();

            return next === undefined
                ? Promise.reject(new Error('no answer queued'))
                : Promise.resolve(next);
        },
    };

    return link;
}

/** The reply main gives to a request that went well. */
export function okReply(text: string | undefined, status = 200): string {
    return JSON.stringify({
        ok: true,
        status,
        headers: [{ name: 'content-type', value: 'text/plain' }],
        ...(text === undefined ? {} : { text }),
        timeMs: 12,
    });
}

/** Like `outputAt`, for a script that may send over `link`. */
export async function linkedOutput(
    wasm: WasmModule,
    link: SendLink,
    source: string,
    event: ScriptRunInput['event'] = 'onBeforeRequest',
): Promise<ScriptRunOutput> {
    return outputIn(await runScript(wasm, inputAt(event, source), { link }));
}
