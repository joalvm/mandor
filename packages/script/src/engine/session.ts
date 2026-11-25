import type { ScriptError } from '@mandor/schema';
import type { QuickJSContext, QuickJSHandle, QuickJSRuntime } from 'quickjs-emscripten-core';

import type { EngineFault, SendLink } from '../contract/worker-message.js';
import { SCRIPT_LIMITS } from '../limits/script-limits.js';

import { DESCRIBE_THROWN } from './guest/frame-guest.js';
import { newGuestClock, type GuestClock } from './guest-clock.js';
import { parseThrown, SCRIPT_FILE, UNREADABLE, type LineWindow } from './parse-thrown.js';
import { addSchemaCheck } from './schema-bridge.js';
import { newSendBridge, type SendBridge } from './send-bridge.js';
import type { WasmModule } from './wasm-module.js';

export type RunResult =
    { ok: true; value: string } | { ok: false; error: ScriptError; fault?: EngineFault };

export type RunOptions = {
    /** Where the script sits inside the source, so an error is placed in the script. */
    lines?: LineWindow;
    /** What to evaluate when the result stays pending once no job is left. */
    rescue?: string;
    /** How the guest talks to main to send a request; without it the guest has no way out. */
    link?: SendLink | undefined;
};

export type Session = {
    runtime: QuickJSRuntime;
    context: QuickJSContext;
    describe: QuickJSHandle;
    clock: GuestClock;
    runMs: number;
    lines: LineWindow | undefined;
    rescue: string | undefined;
    bridge: SendBridge | undefined;
};

type PromiseState = ReturnType<QuickJSContext['getPromiseState']>;

/** The handle a settled state holds for its reader to let go. A value that is no promise holds none. */
function heldOf(state: PromiseState): QuickJSHandle | undefined {
    if (state.type === 'rejected') {
        return state.error;
    }

    return 'value' in state && state.notAPromise !== true ? state.value : undefined;
}

/**
 * Reading a thrown value runs code of the guest (a getter of `message`, a `toString`), so it is
 * measured like the script: outside the clock the interrupt would never come.
 */
function readThrown(session: Session, thrown: QuickJSHandle): ScriptError {
    const { context, describe, lines, clock } = session;
    const called = clock.measure(() => context.callFunction(describe, context.undefined, thrown));

    if (called.error) {
        called.error.dispose();

        return UNREADABLE;
    }

    try {
        return parseThrown(context.getString(called.value), lines);
    } finally {
        called.value.dispose();
    }
}

/** The error the engine throws when the memory of the runtime is used up. */
export function isOutOfMemory(error: ScriptError): boolean {
    return error.errorName === 'InternalError' && /out of memory/iu.test(error.message);
}

function faultOf(error: ScriptError, clock: GuestClock): EngineFault | undefined {
    if (clock.exceeded) {
        return 'timeout';
    }

    return isOutOfMemory(error) ? 'memory' : undefined;
}

function timedOut(runMs: number): RunResult {
    const error = {
        message: `The script ran longer than ${String(runMs)} ms`,
        errorName: 'Timeout',
        limit: runMs,
    };

    return { ok: false, error, fault: 'timeout' };
}

/** The result of a script that threw `thrown`; the handle is let go. */
function failure(session: Session, thrown: QuickJSHandle): RunResult {
    const read = readThrown(session, thrown);
    const fault = faultOf(read, session.clock);

    thrown.dispose();

    if (fault === 'timeout') {
        return timedOut(session.runMs);
    }

    return fault === undefined ? { ok: false, error: read } : { ok: false, error: read, fault };
}

function readString(context: QuickJSContext, handle: QuickJSHandle): RunResult {
    const type = context.typeof(handle);

    if (type !== 'string') {
        return {
            ok: false,
            error: {
                message: `The script ended on ${type}, and only a string crosses`,
                errorName: 'ResultNotString',
            },
        };
    }

    return { ok: true, value: context.getString(handle) };
}

export const PENDING_MESSAGE = 'The script did not finish: it waits for something that cannot come';

const PENDING: RunResult = {
    ok: false,
    error: { message: PENDING_MESSAGE, errorName: 'ScriptPending' },
};

/**
 * A result that stays pending once no job is left can come to an end by itself: `rescue` is
 * evaluated, and the string it gives is the result. Without it, the script did not finish.
 */
function rescued(session: Session): RunResult {
    const { context, clock, rescue } = session;

    if (rescue === undefined) {
        return PENDING;
    }

    const result = clock.measure(() => context.evalCode(rescue, 'rescue.js'));

    if (result.error) {
        return failure(session, result.error);
    }

    try {
        return readString(context, result.value);
    } finally {
        result.value.dispose();
    }
}

/** What each state of a promise comes to, by its type. A value that is not a promise is fulfilled. */
const SETTLED: {
    [T in PromiseState['type']]: (
        session: Session,
        state: Extract<PromiseState, { type: T }>,
    ) => RunResult;
} = {
    pending: (session) => rescued(session),
    rejected: (session, state) => failure(session, state.error),
    fulfilled: (session, state) => {
        try {
            return readString(session.context, state.value);
        } finally {
            heldOf(state)?.dispose();
        }
    },
};

/** Runs the jobs that are ready; a script that throws in one of them ends the run. */
export function drainJobs(session: Session): RunResult | undefined {
    const jobs = session.clock.measure(() => session.runtime.executePendingJobs());

    return jobs.error ? failure(session, jobs.error) : undefined;
}

/** What a promise, or a plain value, ends on once every job that could settle it has run. */
function settle(session: Session, handle: QuickJSHandle): RunResult {
    const state = session.context.getPromiseState(handle);

    return (SETTLED[state.type] as (session: Session, state: PromiseState) => RunResult)(
        session,
        state,
    );
}

/**
 * What the run ends on once nothing can move: `early` if a job already ended it, else what the
 * promise of the script came to. A script that is stopped by the clock may have its stop caught by
 * the guest and end well: the time it spent is what counts, not what it ended on.
 */
export function conclude(
    session: Session,
    handle: QuickJSHandle,
    early: RunResult | undefined,
): RunResult {
    const outcome = early ?? settle(session, handle);

    return session.clock.exceeded ? timedOut(session.runMs) : outcome;
}

/** Whether the promise has not come to an end; the state it reads is let go either way. */
export function isPending(context: QuickJSContext, handle: QuickJSHandle): boolean {
    const state = context.getPromiseState(handle);

    heldOf(state)?.dispose();

    return state.type === 'pending';
}

/** Evaluates the source: the handle of what it gave, or the result when it threw. */
export function start(
    session: Session,
    source: string,
): { handle: QuickJSHandle } | { failed: RunResult } {
    const result = session.clock.measure(() => session.context.evalCode(source, SCRIPT_FILE));

    return result.error ? { failed: failure(session, result.error) } : { handle: result.value };
}

export function newSession(wasm: WasmModule, runMs: number, options: RunOptions): Session {
    const runtime = wasm.newRuntime();
    const clock = newGuestClock(runMs);

    runtime.setMemoryLimit(SCRIPT_LIMITS.memoryBytes);
    runtime.setMaxStackSize(SCRIPT_LIMITS.stackBytes);
    runtime.setInterruptHandler(() => clock.interrupt());

    const context = runtime.newContext();
    const describe = context.unwrapResult(context.evalCode(DESCRIBE_THROWN, 'describe.js'));
    const bridge = options.link === undefined ? undefined : newSendBridge(context, options.link);

    addSchemaCheck(context);

    return {
        runtime,
        context,
        describe,
        clock,
        runMs,
        lines: options.lines,
        rescue: options.rescue,
        bridge,
    };
}

/** Frees the session; every handle must be gone first, or the runtime aborts. */
export function closeSession(session: Session): void {
    session.bridge?.dispose();
    session.describe.dispose();
    session.context.dispose();
    session.runtime.dispose();
}

/** What a thrown cause that is none of the script's comes to: a trap of the instance. */
export function trapped(cause: unknown): RunResult {
    return {
        ok: false,
        error: { message: String(cause), errorName: 'EngineTrap' },
        fault: 'trap',
    };
}
