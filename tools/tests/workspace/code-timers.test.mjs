import { describe, expect, it } from 'vitest';

import { calledFromCode, timerLedger } from '../../workspace/code-timers.mjs';

/** A clock that only fires when the test says so, and remembers what was cancelled. */
function clock(fromCode = true) {
    /** @type {Map<number, () => void>} */
    const armed = new Map();
    /** @type {unknown[]} */
    const cleared = [];
    let last = 0;

    return {
        armed,
        cleared,
        fromCode: () => fromCode,
        set: (/** @type {(...args: unknown[]) => void} */ callback, _delay, ...rest) => {
            last += 1;
            armed.set(last, () => callback(...rest));

            return last;
        },
        clear: (/** @type {number} */ handle) => {
            cleared.push(handle);
            armed.delete(handle);
        },
    };
}

describe('what the code leaves waiting when a test file ends (timerLedger)', () => {
    /**
     * A write deferred until the typing stops kept its timer past the end of the file, and fired
     * inside the next one, on the bridge that file was spying on. It runs in its own file instead,
     * the way a closing window flushes what it owes the disk.
     */
    it('runs a deferred call of the code once, before the file ends', () => {
        const host = clock();
        const ledger = timerLedger(host);
        const writes = [];

        ledger.start((/** @type {string} */ id) => writes.push(id), 400, 'orders');
        ledger.runLeftovers();
        ledger.runLeftovers();

        expect(writes).toEqual(['orders']);
        expect(host.armed.size).toBe(0);
    });

    it('leaves alone a timer that already fired or that the code stopped', () => {
        const host = clock();
        const ledger = timerLedger(host);
        const runs = [];
        const fired = ledger.start(() => runs.push('fired'), 400);
        const stopped = ledger.start(() => runs.push('stopped'), 400);

        host.armed.get(Number(fired))?.();
        ledger.stop(stopped);
        ledger.runLeftovers();

        expect(runs).toEqual(['fired']);
        expect(host.cleared).toEqual([stopped]);
    });

    /** A library and a test keep their own timers: only a wait the code started is the code's. */
    it('runs no timer of a library or of a test, and no turn without a delay', () => {
        const library = timerLedger(clock(false));
        const code = timerLedger(clock());
        const runs = [];

        library.start(() => runs.push('library'), 5000);
        code.start(() => runs.push('turn'), 0);
        code.start(() => runs.push('turn'));
        library.runLeftovers();
        code.runLeftovers();

        expect(runs).toEqual([]);
    });

    it('runs what a leftover schedules in turn', () => {
        const ledger = timerLedger(clock());
        const runs = [];

        ledger.start(() => {
            runs.push('write');
            ledger.start(() => runs.push('record of the write'), 50);
        }, 400);
        ledger.runLeftovers();

        expect(runs).toEqual(['write', 'record of the write']);
    });

    it('fails on code that never stops scheduling, instead of running forever', () => {
        const ledger = timerLedger(clock());
        const again = () => {
            ledger.start(again, 1000);
        };

        ledger.start(again, 1000);

        expect(() => {
            ledger.runLeftovers();
        }).toThrow(/keeps scheduling/u);
    });
});

describe('whose a timer is (calledFromCode)', () => {
    const LEDGER = 'C:\\repo\\tools\\workspace\\code-timers.mjs';

    it('is the code of a package or an app when the first caller outside the ledger is in its src', () => {
        expect(
            calledFromCode([LEDGER, 'C:\\repo\\packages\\shell\\src\\session\\saver.ts', 'x']),
        ).toBe(true);
        expect(calledFromCode([LEDGER, '/repo/apps/async/src/renderer/write.ts'])).toBe(true);
    });

    it('is not the code when the caller is a library, a test or the runtime', () => {
        expect(
            calledFromCode([LEDGER, '/repo/node_modules/dockview/packages/core/src/grid.js']),
        ).toBe(false);
        expect(calledFromCode([LEDGER, '/repo/packages/shell/tests/support/server.ts'])).toBe(
            false,
        );
        expect(calledFromCode([LEDGER, 'node:internal/timers'])).toBe(false);
        expect(calledFromCode([LEDGER])).toBe(false);
    });
});
