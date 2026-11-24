import type { RequestScriptOutput } from '@mandor/ipc';

import type { GuardedRequest } from './guarded-resolution.js';
import type { ScriptsOutput } from './send-chain.js';

/** What the send itself says beside its scripts: what it withheld, and where a redirect stopped. */
export type SendMarks = {
    guarded?: GuardedRequest | undefined;
    heldAt?: string | undefined;
};

/** A phase whose scripts did not run, because the send skipped them: it still says its marks. */
const NOTHING_RAN: Omit<ScriptsOutput, 'effects'> = {
    logs: [],
    tests: [],
    skipped: [],
    switchedOff: 0,
    variables: [],
};

const NOT_GUARDED: Pick<GuardedRequest, 'withheld' | 'destinationMoved'> = {
    withheld: [],
    destinationMoved: false,
};

/** The push of one phase of a send: what its scripts said and the marks of the send. */
export function scriptOutputPush(
    at: Pick<RequestScriptOutput, 'sendId' | 'phase'>,
    output: ScriptsOutput | undefined,
    marks: SendMarks,
): RequestScriptOutput {
    const { logs, tests, skipped, switchedOff, variables, error } = output ?? NOTHING_RAN;
    const { withheld, destinationMoved } = marks.guarded ?? NOT_GUARDED;

    return {
        ...at,
        logs,
        tests,
        skipped,
        switchedOff,
        variables,
        withheld,
        destinationMoved,
        ...(marks.heldAt === undefined ? {} : { heldAt: marks.heldAt }),
        ...(error === undefined ? {} : { error }),
    };
}
