import { describe, expect, it } from 'vitest';

import { connectionScriptEntry } from '../../../../../src/renderer/features/connections/lib/connection-script-entry.js';
import { scriptNoteOf } from '../../../support/activity-entries.js';

describe('the line a note of the scripts writes on the timeline', () => {
    it('writes nothing for a note that says nothing', () => {
        expect(connectionScriptEntry(scriptNoteOf())).toBeUndefined();
    });

    it.each([
        ['a line', { logs: [{ level: 'log' as const, text: 'hi' }] }],
        ['a case', { tests: [{ name: 'ok', passed: true }] }],
        ['a run left out', { dropped: 1 }],
        ['a run switched off', { switchedOff: 1 }],
        ['a value set', { variables: [{ name: 'a', preview: '1' }] }],
        ['a secret left out', { withheld: ['token'] }],
        ['an open without secrets', { secretsOff: 'polling' as const }],
        ['an error', { error: { message: 'boom', errorName: 'Error' } }],
    ])('writes a line for a note with %s', (_, changes) => {
        expect(connectionScriptEntry(scriptNoteOf(changes))?.kind).toBe('connection-script');
    });

    it('carries the note whole, at its moment, weighing what its text weighs', () => {
        const note = scriptNoteOf({ at: 42, logs: [{ level: 'log', text: 'hi' }] });

        expect(connectionScriptEntry(note)).toEqual({
            at: 42,
            bytes: JSON.stringify(note).length,
            detail: note,
            kind: 'connection-script',
        });
    });
});
