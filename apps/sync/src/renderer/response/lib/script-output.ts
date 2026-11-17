import type { RequestScriptOutput } from '@mandor/ipc';
import type { ChainLog, ScriptError, ScriptTest, SkippedScript } from '@mandor/schema';

/** What the scripts of one send said, both moments of it joined. */
export type ScriptOutput = {
    logs: ChainLog[];
    tests: ScriptTest[];
    skipped: SkippedScript[];
    /** The scripts of another tool on the way: counted, never run. */
    imported: number;
    /** The scripts that would have run, had the switch of this machine been on. */
    switchedOff: number;
    errors: ScriptError[];
    withheld: string[];
    /** A script moved where the send went: it left with no secret. */
    destinationMoved: boolean;
    /** Where a redirect stopped, because going on would have taken a secret along. */
    heldAt?: string | undefined;
};

const NO_OUTPUT: ScriptOutput = {
    logs: [],
    tests: [],
    skipped: [],
    imported: 0,
    switchedOff: 0,
    errors: [],
    withheld: [],
    destinationMoved: false,
};

/**
 * What a send said so far, once one more of its moments told its part: the lines, tests and
 * scripts left out of each are added in the order they came, the counts summed. The marks of the
 * send ride every push, so they are kept once.
 */
export function joinedScriptOutput(
    before: ScriptOutput | undefined,
    push: RequestScriptOutput,
): ScriptOutput {
    const output = before ?? NO_OUTPUT;
    const heldAt = push.heldAt ?? output.heldAt;

    return {
        logs: [...output.logs, ...push.logs],
        tests: [...output.tests, ...push.tests],
        skipped: [...output.skipped, ...push.skipped],
        imported: output.imported + push.imported,
        switchedOff: output.switchedOff + push.switchedOff,
        errors: push.error === undefined ? output.errors : [...output.errors, push.error],
        withheld: [...new Set([...output.withheld, ...push.withheld])],
        destinationMoved: output.destinationMoved || push.destinationMoved,
        ...(heldAt === undefined ? {} : { heldAt }),
    };
}
