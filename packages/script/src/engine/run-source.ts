import { SCRIPT_LIMITS } from '../limits/script-limits.js';

import {
    closeSession,
    conclude,
    drainJobs,
    isPending,
    newSession,
    start,
    trapped,
    type RunOptions,
    type RunResult,
    type Session,
} from './session.js';
import type { WasmModule } from './wasm-module.js';

/**
 * Lets the script go on while it waits for main: as long as a send is unanswered and the script
 * has not ended, it waits for one answer, hands it to the guest and runs the jobs that follow.
 * The time of the wait is not time of the script: the clock counts only where the guest runs.
 */
async function pump(
    session: Session,
    handle: Parameters<typeof conclude>[1],
): Promise<RunResult | undefined> {
    const { bridge, context } = session;
    let early = drainJobs(session);

    while (
        early === undefined &&
        bridge !== undefined &&
        bridge.pending > 0 &&
        isPending(context, handle)
    ) {
        if (await bridge.next()) {
            early = drainJobs(session);
        }
    }

    return early;
}

async function evaluate(session: Session, source: string): Promise<RunResult> {
    const started = start(session, source);

    if ('failed' in started) {
        return started.failed;
    }

    try {
        return conclude(session, started.handle, await pump(session, started.handle));
    } finally {
        started.handle.dispose();
    }
}

/**
 * Runs one script on a runtime and a context of its own, over the WASM instance, and hands back
 * the string it ends on (or the one a promise it ends on is fulfilled with) or the error it threw.
 * `options.lines` places an error in the script and not in what wraps it. With `options.link` the
 * guest may ask main, and the run waits for the answers; without it the guest has no way out.
 * Nothing of the script survives the call, answered or not.
 *
 * A script that uses up its time or memory, or a WASM that traps, comes back with a `fault`: the
 * instance is not to be used again.
 */
export async function runSource(
    wasm: WasmModule,
    source: string,
    runMs: number = SCRIPT_LIMITS.runMs,
    options: RunOptions = {},
): Promise<RunResult> {
    try {
        const session = newSession(wasm, runMs, options);
        const result = await evaluate(session, source);

        closeSession(session);

        return result;
    } catch (cause) {
        return trapped(cause);
    }
}
