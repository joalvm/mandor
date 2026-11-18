import { describe, expect, it } from 'vitest';

import { requestScriptOutputSchema, wsScriptNoteSchema } from '../../src/index.js';
import { SCRIPT_SAID_SHAPE } from '../../src/script/script-said.js';

const SAID = {
    logs: [{ level: 'log', text: 'hi' }],
    tests: [{ name: 'ok', passed: true }],
    skipped: [],
    switchedOff: 0,
    variables: [{ name: 'a', preview: 'x'.repeat(256) }],
    withheld: ['token'],
};

const NOTE = { connectionId: 'alpha', event: 'onConnect', at: 1, dropped: 0, ...SAID };

const OUTPUT = {
    sendId: '0b6f1d2e-3c4a-4b5c-8d9e-0f1a2b3c4d5e',
    phase: 'before',
    imported: 0,
    destinationMoved: false,
    ...SAID,
};

describe('what the scripts of one run said, as the window reads it', () => {
    it('is read the same after a send and on a connection', () => {
        expect(Object.keys(SCRIPT_SAID_SHAPE).every((key) => key in NOTE && key in OUTPUT)).toBe(
            true,
        );
        expect(wsScriptNoteSchema.safeParse(NOTE).success).toBe(true);
        expect(requestScriptOutputSchema.safeParse(OUTPUT).success).toBe(true);
    });

    it('lets the window see no more than the preview of a value', () => {
        const longer = { ...SAID, variables: [{ name: 'a', preview: 'x'.repeat(257) }] };

        expect(wsScriptNoteSchema.safeParse({ ...NOTE, ...longer }).success).toBe(false);
        expect(requestScriptOutputSchema.safeParse({ ...OUTPUT, ...longer }).success).toBe(false);
    });

    it('counts no run below zero', () => {
        expect(wsScriptNoteSchema.safeParse({ ...NOTE, switchedOff: -1 }).success).toBe(false);
    });
});
