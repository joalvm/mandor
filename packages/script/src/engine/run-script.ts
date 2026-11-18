import type { ScriptError } from '@mandor/schema';
import { z } from 'zod';

import {
    scriptRunOutputSchema,
    type ScriptRunInput,
    type ScriptRunOutput,
} from '../contract/script-run.js';
import type { EngineFault, SendLink } from '../contract/worker-message.js';
import { SCRIPT_LIMITS } from '../limits/script-limits.js';

import { parseJson, parseThrown, type LineWindow } from './parse-thrown.js';
import { runSource } from './run-source.js';
import { RESCUE, SCRIPT_FIRST_LINE, scriptSourceOf } from './script-source.js';
import { isOutOfMemory, type RunResult } from './session.js';
import type { WasmModule } from './wasm-module.js';

/**
 * What a run of a script comes to. A script that throws, or that does not finish, is an output
 * with its `error`: the instance is fine. Only a fault (time, memory, trap) leaves the instance
 * unfit, and then there is no output: whatever the script had written is lost with it.
 */
export type ScriptRunResult =
    { ok: true; output: ScriptRunOutput } | { ok: false; error: ScriptError; fault: EngineFault };

/** What the guest ends on: the output of the run, with the error still as the text it made. */
const guestOutputSchema = scriptRunOutputSchema
    .omit({ error: true })
    .extend({ error: z.string().optional() });

function failed(error: ScriptError): ScriptRunOutput {
    return { effects: [], logs: [], tests: [], error };
}

/**
 * What the guest ended on. A script that caught the error of the memory used up is still a fault:
 * the instance is not fit.
 */
function resultOf(text: string, span: LineWindow): ScriptRunResult {
    const parsed = guestOutputSchema.safeParse(parseJson(text));

    if (!parsed.success) {
        return {
            ok: true,
            output: failed({
                message: 'The script ended on an output that could not be read',
                errorName: 'OutputInvalid',
            }),
        };
    }

    const { error, ...rest } = parsed.data;

    if (error === undefined) {
        return { ok: true, output: rest };
    }

    const thrown = parseThrown(error, span);

    return isOutOfMemory(thrown)
        ? { ok: false, error: thrown, fault: 'memory' }
        : { ok: true, output: { ...rest, error: thrown } };
}

function spanOf(input: ScriptRunInput): LineWindow {
    return { offset: SCRIPT_FIRST_LINE - 1, lines: input.source.split('\n').length };
}

/** What an engine run came to, as the result of a script. */
function fromRun(result: RunResult, span: LineWindow): ScriptRunResult {
    if (result.ok) {
        return resultOf(result.value, span);
    }

    return result.fault === undefined
        ? { ok: true, output: failed(result.error) }
        : { ok: false, error: result.error, fault: result.fault };
}

/** How a script runs: over what it may send, and for how long. */
export type ScriptRunOptions = {
    /** How main answers a `sendRequest`; without it a `sendRequest` rejects. */
    link?: SendLink | undefined;
    runMs?: number;
};

/**
 * Runs one script with its API and gives back what it did: the effects it asks for, its console,
 * its cases and the error that ended it. The script is the body of an async function: it may
 * `await`, and end with `return`. The line of an error is the one of the script, not of the
 * source the engine runs, and an error with no place in the script has none.
 */
export async function runScript(
    wasm: WasmModule,
    input: ScriptRunInput,
    { link, runMs = SCRIPT_LIMITS.runMs }: ScriptRunOptions = {},
): Promise<ScriptRunResult> {
    const lines = spanOf(input);
    const options = { lines, rescue: `${RESCUE}()`, link };

    return fromRun(await runSource(wasm, scriptSourceOf(input), runMs, options), lines);
}
