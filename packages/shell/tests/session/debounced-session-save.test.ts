import { createFakeBridge } from '@mandor/ipc/testing';
import { success, type UiSession } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createSessionSaver } from '../../src/session/debounced-session-save.js';
import { initialShellData } from '../../src/shell-data.js';

type Written = { session: UiSession };

type Ledger = { runLeftovers: () => void };

function isLedger(value: unknown): value is Ledger {
    return typeof value === 'object' && value !== null && 'runLeftovers' in value;
}

/** What the setup of every file runs on its way out: see `tools/vitest/timers.ts`. */
function endOfFile(): void {
    const ledger: unknown = Reflect.get(globalThis, Symbol.for('mandor.timers.ledger'));

    if (isLedger(ledger)) {
        ledger.runLeftovers();
    }
}

function saverWritingTo(written: Written[]) {
    return createSessionSaver(
        createFakeBridge({
            session: {
                save: (input: Written) => {
                    written.push(input);

                    return Promise.resolve(success({}));
                },
            },
        }),
    );
}

const OPEN = { ...initialShellData(), activeOriginId: 'local' };

describe('the session saved once the layout settles', () => {
    /**
     * The files of a suite share their modules, and a save still waiting when its file ended fired
     * inside the next one, on the bridge that file was spying on. What the window owes the disk
     * lands in the file that scheduled it.
     */
    it('writes a save it still owes when the test file ends, and only once', () => {
        const written: Written[] = [];

        saverWritingTo(written).schedule(OPEN);

        expect(written).toEqual([]);

        endOfFile();
        endOfFile();

        expect(written).toHaveLength(1);
    });

    it('owes nothing once the save was cancelled', () => {
        const written: Written[] = [];
        const saver = saverWritingTo(written);

        saver.schedule(OPEN);
        saver.cancel();
        endOfFile();

        expect(written).toEqual([]);
    });

    /** Main writes the session of the active origin: with none, there is nowhere to write. */
    it('schedules nothing while no origin is open', () => {
        const written: Written[] = [];

        saverWritingTo(written).schedule(initialShellData());
        endOfFile();

        expect(written).toEqual([]);
    });
});
