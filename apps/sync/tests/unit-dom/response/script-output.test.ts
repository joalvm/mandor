import type { RequestScriptOutput } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { joinedScriptOutput } from '../../../src/renderer/response/lib/script-output.js';

const SEND = '00000000-0000-4000-8000-000000000001';

function pushOf(change: Partial<RequestScriptOutput> = {}): RequestScriptOutput {
    return {
        sendId: SEND,
        phase: 'before',
        logs: [],
        tests: [],
        skipped: [],
        imported: 0,
        switchedOff: 0,
        variables: [],
        withheld: [],
        destinationMoved: false,
        ...change,
    };
}

describe('what the scripts of a send said, both moments of it joined', () => {
    it('starts from nothing and keeps what the first moment told', () => {
        expect(joinedScriptOutput(undefined, pushOf({ switchedOff: 2 }))).toEqual({
            logs: [],
            tests: [],
            skipped: [],
            imported: 0,
            switchedOff: 2,
            errors: [],
            withheld: [],
            destinationMoved: false,
        });
    });

    it('adds the second moment after the first, and counts the scripts of both', () => {
        const before = joinedScriptOutput(
            undefined,
            pushOf({
                logs: [{ level: 'info', text: 'uno' }],
                imported: 1,
                skipped: [{ name: 'Altas', level: 'folder', event: 'onBeforeRequest', bytes: 3 }],
            }),
        );
        const both = joinedScriptOutput(
            before,
            pushOf({
                phase: 'response',
                logs: [{ level: 'error', text: 'dos' }],
                imported: 2,
                error: { message: 'boom', errorName: 'TypeError' },
            }),
        );

        expect(both.logs).toEqual([
            { level: 'info', text: 'uno' },
            { level: 'error', text: 'dos' },
        ]);
        expect(both.imported).toBe(3);
        expect(both.skipped).toHaveLength(1);
        expect(both.errors).toEqual([{ message: 'boom', errorName: 'TypeError' }]);
    });

    /** The marks of the send ride every push: told twice, they still read once. */
    it('keeps the marks of the send once, whichever moment told them', () => {
        const before = joinedScriptOutput(
            undefined,
            pushOf({ withheld: ['token'], destinationMoved: true, heldAt: 'https://otro/' }),
        );
        const both = joinedScriptOutput(before, pushOf({ phase: 'response', withheld: ['token'] }));

        expect(both.withheld).toEqual(['token']);
        expect(both.destinationMoved).toBe(true);
        expect(both.heldAt).toBe('https://otro/');
    });
});
