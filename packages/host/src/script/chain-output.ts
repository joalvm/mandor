import type { ChainLog, ScriptError, ScriptTest, SkippedScript } from '@mandor/schema';
import { scriptRunOutputSchema, type ScriptEffect, type ScriptRunOutput } from '@mandor/script';

import type { Logger } from '../log/create-logger.js';
import { answerRedactor } from '../secret/redact-message.js';
import type { ScriptOutcome } from './run-on-worker.js';

/** What a chain of scripts gives back to the send that ran it. */
export type ChainResult = {
    effects: ScriptEffect[];
    logs: ChainLog[];
    tests: ScriptTest[];
    skipped: SkippedScript[];
    /** The scripts that would have run, had the switch of this machine been on. */
    switchedOff: number;
    /** What scripts set so far in the place of the send, cut short and redacted. */
    variables: { name: string; preview: string }[];
    error?: ScriptError;
};

/** How much of a value of a script the window sees. */
const PREVIEW_CHARS = 256;

const UNREADABLE: ScriptError = {
    message: 'The script worker ended on an output that could not be read',
    errorName: 'OutputInvalid',
};

/** The line with every secret of the session out of what it says. */
function hiddenLog(log: ChainLog, hide: (text: string) => string): ChainLog {
    if ('text' in log) {
        return { ...log, text: hide(log.text) };
    }

    const { params } = log;

    if (params === undefined) {
        return log;
    }

    return {
        ...log,
        params: Object.fromEntries(
            Object.entries(params).map(([name, value]) => [
                name,
                typeof value === 'string' ? hide(value) : value,
            ]),
        ),
    };
}

function parsed(text: string): ScriptRunOutput | undefined {
    try {
        const output = scriptRunOutputSchema.safeParse(JSON.parse(text));

        return output.success ? output.data : undefined;
    } catch {
        return undefined;
    }
}

/**
 * The output of one run, or the error that ended it with none. A trap of the engine is a failure
 * of ours, not of the script: the person sees the error all the same, and the log keeps it for a
 * report.
 */
export function outputOfRun(
    outcome: ScriptOutcome,
    entry: { event: string; level: string; name: string },
    logger: Pick<Logger, 'log'>,
): ScriptRunOutput {
    if (outcome.ok) {
        return parsed(outcome.output) ?? { effects: [], logs: [], tests: [], error: UNREADABLE };
    }

    if (outcome.error.errorName === 'EngineTrap') {
        const { event, level, name } = entry;

        logger.log(
            'error',
            `the engine of scripts trapped in ${event} of the ${level} ${name}: ${outcome.error.message}`,
        );
    }

    return { effects: [], logs: [], tests: [], error: outcome.error };
}

/**
 * Takes every secret of the session out of what leaves for the window, the ones known at the end
 * of the chain: a secret that a script made the session learn half way is hidden too.
 */
export function redactedResult(
    result: Omit<ChainResult, 'variables'>,
    variables: Record<string, string>,
): ChainResult {
    const hide = answerRedactor();
    const { error } = result;

    return {
        ...result,
        logs: result.logs.map((log) => hiddenLog(log, hide)),
        tests: result.tests.map((test) => ({
            ...test,
            name: hide(test.name),
            ...(test.message === undefined ? {} : { message: hide(test.message) }),
        })),
        variables: Object.entries(variables).map(([name, value]) => ({
            name,
            preview: hide(value).slice(0, PREVIEW_CHARS),
        })),
        ...(error === undefined ? {} : { error: { ...error, message: hide(error.message) } }),
    };
}
