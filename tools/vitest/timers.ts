// What a test file leaves waiting in the code runs before the file ends, in that file: the rule and
// its reason are in `tools/workspace/code-timers.mjs`. The files of a worker share one global
// scope, so the clock is wrapped once per worker and every file empties the ledger on its way out.
//
// Whose a timer is comes from the file of each frame, read without formatting the stack: the
// remapping of a formatted stack, paid on every timer the suite starts, would cost the run.
import { promisify } from 'node:util';

import { afterAll } from 'vitest';

import { calledFromCode, timerLedger } from '../workspace/code-timers.mjs';

type Ledger = ReturnType<typeof timerLedger>;

const LEDGER = Symbol.for('mandor.timers.ledger');

// The ledger and the frame of the caller: deep enough to reach past both.
const FRAMES = 6;

// The stack as the file of each frame, unformatted: what `callerFiles` hands the runtime to build it.
function filesOfFrames(_error: Error, sites: NodeJS.CallSite[]): string[] {
    return sites.map((site) => site.getFileName() ?? '');
}

// The runner remaps every stack through its own `prepareStackTrace`. It is set aside for one
// capture and put back as it was, without going through a setter it may have.
function callerFiles(): string[] {
    const prepare = Object.getOwnPropertyDescriptor(Error, 'prepareStackTrace');
    const limit = Error.stackTraceLimit;
    const holder: { stack?: unknown } = {};

    Object.defineProperty(Error, 'prepareStackTrace', {
        configurable: true,
        writable: true,
        value: filesOfFrames,
    });
    Error.stackTraceLimit = FRAMES;
    Error.captureStackTrace(holder);

    const files = holder.stack;

    if (prepare === undefined) {
        Reflect.deleteProperty(Error, 'prepareStackTrace');
    } else {
        Object.defineProperty(Error, 'prepareStackTrace', prepare);
    }

    Error.stackTraceLimit = limit;

    return Array.isArray(files) ? (files as string[]) : [];
}

// What the global scope holds under the mark: the ledger of this worker, once it was made.
function isLedger(value: unknown): value is Ledger {
    return typeof value === 'object' && value !== null && 'runLeftovers' in value;
}

function ledger(): Ledger {
    const existing: unknown = Reflect.get(globalThis, LEDGER);

    if (isLedger(existing)) {
        return existing;
    }

    const set = globalThis.setTimeout;
    const fresh = timerLedger({
        set,
        clear: globalThis.clearTimeout,
        fromCode: () => calledFromCode(callerFiles()),
    });

    Reflect.set(globalThis, LEDGER, fresh);
    // `promisify(setTimeout)` reads its promise form off the function itself. The clock of the
    // ledger takes what the runtime's does, and is set as one: the overloads of the runtime's
    // type are not something a wrapper can be written as.
    const promised: unknown = Reflect.get(set, promisify.custom);

    Reflect.set(
        globalThis,
        'setTimeout',
        Object.assign(fresh.start, { [promisify.custom]: promised }),
    );
    globalThis.clearTimeout = fresh.stop;

    return fresh;
}

const timers = ledger();

afterAll(() => {
    timers.runLeftovers();
});
