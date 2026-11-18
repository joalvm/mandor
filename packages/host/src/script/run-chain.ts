import { scriptNotice, type ScriptError } from '@mandor/schema';
import {
    SCRIPT_LIMITS,
    clampOutput,
    type ScriptEffect,
    type ScriptRunInput,
    type ScriptSnapshot,
} from '@mandor/script';

import type { Logger } from '../log/create-logger.js';
import { sortEntries, type ChainEntry } from './chain-entries.js';
import { outputOfRun, redactedResult, type ChainResult } from './chain-output.js';
import type { ApprovedScripts } from './approved-scripts.js';
import type { ScriptSender } from './script-send.js';
import type { ScriptVariables, ScriptVariablesPlace } from './script-variables.js';
import type { ScriptsSwitch } from './scripts-switch.js';
import type { ScriptChain, ScriptChainOptions } from './start-script-worker.js';

/** What a script sees, but its `info`: the chain writes that for each script. */
export type ChainSnapshot = Omit<ScriptSnapshot, 'info'>;

export type ChainRun = {
    entries: readonly ChainEntry[];
    snapshot: ChainSnapshot;
    /** The photo the next script starts on, after what this one asked for. */
    advance: (snapshot: ChainSnapshot, effects: readonly ScriptEffect[]) => ChainSnapshot;
    signal: AbortSignal;
    place: ScriptVariablesPlace;
    /** Answers a `sendRequest`; without it a script that sends is cut. */
    send?: ScriptSender | undefined;
};

export type ChainDeps = {
    approvals: Pick<ApprovedScripts, 'isApproved'>;
    scriptsSwitch: Pick<ScriptsSwitch, 'enabled'>;
    variables: ScriptVariables;
    /** Where the scripts run: the workers of the app, or a double in a test. */
    startChain: (options: ScriptChainOptions) => ScriptChain;
    logger: Pick<Logger, 'log'>;
    limits?: Partial<Record<'chainMs' | 'chainScripts', number>>;
};

type Ran = Pick<ChainResult, 'effects' | 'logs' | 'tests' | 'error'>;

type Step = {
    run: ChainRun;
    deps: ChainDeps;
    chain: ScriptChain;
    signal: AbortSignal;
    timeout: AbortSignal;
};

const CANCELLED: ScriptError = { message: 'The run was cancelled', errorName: 'Cancelled' };

function isVar(effect: ScriptEffect): effect is Extract<ScriptEffect, { kind: 'var' }> {
    return effect.kind === 'var';
}

function chainMsOf(deps: ChainDeps): number {
    return deps.limits?.chainMs ?? SCRIPT_LIMITS.chainMs;
}

/** Why a run ended with nothing to keep: its own error, the clock of the chain, or a cancel. */
function endOf(step: Step, error: ScriptError | undefined): ScriptError | undefined {
    if (step.timeout.aborted) {
        const limit = chainMsOf(step.deps);

        return {
            message: `The scripts ran longer than ${String(limit)} ms`,
            errorName: 'Timeout',
            limit,
        };
    }

    return error ?? (step.signal.aborted ? CANCELLED : undefined);
}

/** Runs one script on the photo; keeps what it set only if it ended clean and nothing moved on. */
async function runOne(step: Step, entry: ChainEntry, snapshot: ChainSnapshot): Promise<Ran> {
    const { run, deps } = step;
    const generation = deps.variables.generation(run.place);
    const info = { event: entry.event, name: entry.name };
    const input: ScriptRunInput = {
        event: entry.event,
        source: entry.source,
        snapshot: { ...snapshot, info },
    };
    const outcome = await step.chain.run(JSON.stringify(input), step.signal);
    const output = clampOutput(outputOfRun(outcome, entry, deps.logger), entry.event);
    const error = endOf(step, output.error);
    const { logs, tests } = output;

    if (error !== undefined) {
        return { effects: [], logs, tests, error: { ...error, ...info, level: entry.level } };
    }

    const sets = output.effects.filter(isVar);
    const full = deps.variables.apply(run.place, generation, sets) === 'full';
    const note = scriptNotice('variables-full');

    return { effects: output.effects, logs: full ? [...logs, note] : logs, tests };
}

/** Each script in order on the photo the one before left; the first error ends the chain. */
async function runEach(step: Step, runnable: readonly ChainEntry[]): Promise<Ran> {
    const ran: Ran = { effects: [], logs: [], tests: [] };
    let snapshot = step.run.snapshot;

    for (const entry of runnable) {
        const one = await runOne(step, entry, snapshot);

        ran.effects.push(...one.effects);
        ran.logs.push(...one.logs);
        ran.tests.push(...one.tests);

        if (one.error !== undefined) {
            return { ...ran, error: one.error };
        }

        snapshot = step.run.advance(snapshot, one.effects);
    }

    return ran;
}

/** One clock and one chain of workers for every script; the chain lets its workers go at the end. */
async function runAll(run: ChainRun, deps: ChainDeps, runnable: ChainEntry[]): Promise<Ran> {
    const timeout = AbortSignal.timeout(chainMsOf(deps));
    const signal = AbortSignal.any([run.signal, timeout]);
    const chain = deps.startChain({ onSend: run.send });

    try {
        return await runEach({ run, deps, chain, signal, timeout }, runnable);
    } finally {
        chain.close();
    }
}

/** Why nothing of a chain runs, before a worker is asked for: the switch, or too many scripts. */
function refusalOf(deps: ChainDeps, count: number): Omit<ChainResult, 'variables'> | undefined {
    const empty = { effects: [], tests: [], skipped: [], switchedOff: 0 };
    const chainScripts = deps.limits?.chainScripts ?? SCRIPT_LIMITS.chainScripts;

    // The count is all the window needs to say it, once, in the language of the person.
    if (!deps.scriptsSwitch.enabled()) {
        return { ...empty, switchedOff: count, logs: [] };
    }

    if (count > chainScripts) {
        return {
            ...empty,
            logs: [scriptNotice('chain-too-long', { scripts: count, limit: chainScripts })],
        };
    }

    return undefined;
}

/**
 * Runs the scripts of a send in order. The switch of this machine is read here, never taken from
 * the window; a chain over the limit runs nothing; a script nobody approved is skipped and told,
 * and the others run. The whole chain shares one clock, and the first error ends it. What a script
 * set is kept when it ends clean, even if the next one fails. The shape of the request is the
 * caller's: `advance` says what the next script sees.
 */
export async function runChain(run: ChainRun, deps: ChainDeps): Promise<ChainResult> {
    const enabled = run.entries.filter((entry) => entry.enabled !== false);
    const values = (): Record<string, string> => deps.variables.values(run.place);

    if (enabled.length === 0) {
        return redactedResult(
            { effects: [], logs: [], tests: [], skipped: [], switchedOff: 0 },
            values(),
        );
    }

    const refusal = refusalOf(deps, enabled.length);

    if (refusal !== undefined) {
        return redactedResult(refusal, values());
    }

    const sorted = await sortEntries(enabled, run.place, deps.approvals);
    const ran: Ran =
        sorted.runnable.length === 0
            ? { effects: [], logs: [], tests: [] }
            : await runAll(run, deps, sorted.runnable);
    const logs = [...sorted.logs, ...ran.logs];

    return redactedResult({ ...ran, logs, skipped: sorted.skipped, switchedOff: 0 }, values());
}
