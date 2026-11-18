import { describe, expect, it } from 'vitest';

import { blankNote, mergeNotes, type EventNote } from '../../../../src/main/ws/event-note.js';

// What the scripts of a connection say: the runs of one second as one note.

function said(texts: string[], changes: Partial<EventNote> = {}): EventNote {
    return {
        ...blankNote('echo', 'onMessage'),
        logs: texts.map((text) => ({ level: 'log' as const, text })),
        ...changes,
    };
}

describe('the note of a connection', () => {
    it('starts with nothing to say', () => {
        expect(blankNote('echo', 'onConnect')).toMatchObject({
            connectionId: 'echo',
            event: 'onConnect',
            logs: [],
            tests: [],
            skipped: [],
            dropped: 0,
            switchedOff: 0,
            variables: [],
            withheld: [],
        });
    });

    it('is the second one alone when nothing came before', () => {
        const only = said(['a']);

        expect(mergeNotes(undefined, only)).toBe(only);
    });

    it('keeps the lines in order, adds the counts and keeps the last values and error', () => {
        const merged = mergeNotes(
            said(['a'], {
                dropped: 1,
                switchedOff: 1,
                variables: [{ name: 'n', preview: '1' }],
                error: { message: 'first', errorName: 'Error' },
            }),
            said(['b'], {
                dropped: 2,
                tests: [{ name: 't', passed: true }],
                variables: [{ name: 'n', preview: '2' }],
                error: { message: 'second', errorName: 'Error' },
            }),
        );

        expect(merged).toMatchObject({
            logs: [{ text: 'a' }, { text: 'b' }],
            tests: [{ name: 't', passed: true }],
            dropped: 3,
            switchedOff: 1,
            variables: [{ name: 'n', preview: '2' }],
            error: { message: 'second' },
        });
    });

    it('names each secret left out once, and keeps how a socket opened', () => {
        const merged = mergeNotes(
            said([], { withheld: ['token', 'key'], secretsOff: 'polling' }),
            said([], { withheld: ['token'] }),
        );

        expect(merged.withheld).toEqual(['token', 'key']);
        expect(merged.secretsOff).toBe('polling');
    });

    it('keeps the error of before when the second ran clean', () => {
        const merged = mergeNotes(
            said([], { error: { message: 'first', errorName: 'Error' } }),
            said([]),
        );

        expect(merged.error?.message).toBe('first');
    });

    it('cuts the lines past the cap once, and says so', () => {
        const many = Array.from({ length: 150 }, (_, index) => String(index));
        let note = mergeNotes(said(many), said(many));

        note = mergeNotes(note, said(many));

        expect(note.logs).toHaveLength(201);
        expect(note.logs.at(199)).toMatchObject({ text: '49' });
        expect(note.logs.at(-1)).toEqual({
            level: 'warn',
            notice: 'lines-cut',
            params: { limit: 200 },
        });
    });
});
