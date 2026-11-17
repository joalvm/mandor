import { describe, expect, it } from 'vitest';

import { fitScriptNote, wsScriptNoteSchema, type WsScriptNote } from '../../src/index.js';

const note: WsScriptNote = {
    connectionId: 'gateway',
    event: 'onMessage',
    at: 1,
    logs: [
        { level: 'log', text: 'hi' },
        { level: 'warn', notice: 'queue-full', params: { count: 3 } },
    ],
    tests: [{ name: 'is pong', passed: true }],
    skipped: [],
    dropped: 3,
    switchedOff: 0,
    variables: [{ name: 'token', preview: 'abc' }],
    withheld: ['apiKey'],
};

function weightOf(value: WsScriptNote): number {
    return new TextEncoder().encode(JSON.stringify(value)).length;
}

describe('the push of ws:script-note', () => {
    it('carries what the scripts of a connection said', () => {
        expect(wsScriptNoteSchema.parse(note)).toEqual(note);
    });

    it('carries why the socket opened with no secret, and the error that ended a run', () => {
        const opened = {
            ...note,
            event: 'onBeforeConnect',
            secretsOff: 'polling',
            error: { message: 'no ticket', errorName: 'Error', event: 'onBeforeConnect' },
        };

        expect(wsScriptNoteSchema.parse(opened)).toEqual(opened);
    });

    it('refuses an event no connection has, a count below zero and a field it does not know', () => {
        expect(wsScriptNoteSchema.safeParse({ ...note, event: 'onResponse' }).success).toBe(false);
        expect(wsScriptNoteSchema.safeParse({ ...note, dropped: -1 }).success).toBe(false);
        expect(wsScriptNoteSchema.safeParse({ ...note, extra: 1 }).success).toBe(false);
        expect(wsScriptNoteSchema.safeParse({ ...note, secretsOff: 'always' }).success).toBe(false);
    });

    it('refuses a preview longer than the window shows', () => {
        const long = { ...note, variables: [{ name: 'big', preview: 'x'.repeat(257) }] };

        expect(wsScriptNoteSchema.safeParse(long).success).toBe(false);
    });
});

describe('a note within what one note carries', () => {
    it('is the same note when it fits', () => {
        expect(fitScriptNote(note)).toBe(note);
    });

    it('lets the sources of the skipped scripts go first, and says it cut', () => {
        const skipped = {
            ...note,
            skipped: [
                {
                    name: 'Gateway',
                    level: 'connection' as const,
                    event: 'onMessage' as const,
                    bytes: 4_000,
                    source: 'x'.repeat(4_000),
                },
            ],
        };
        const fitted = fitScriptNote(skipped, 2_000);

        expect(fitted.skipped).toEqual([
            { name: 'Gateway', level: 'connection', event: 'onMessage', bytes: 4_000 },
        ]);
        expect(fitted.logs).toEqual([...note.logs, { level: 'warn', notice: 'note-cut' }]);
        expect(weightOf(fitted)).toBeLessThanOrEqual(2_000);
    });

    it('keeps the first lines and cases, in order, under the bytes with the line that says so', () => {
        const many = {
            ...note,
            logs: Array.from({ length: 400 }, (_, index) => ({
                level: 'log' as const,
                text: `line ${String(index)} ${'y'.repeat(40)}`,
            })),
        };
        const fitted = fitScriptNote(many, 4_000);

        expect(weightOf(fitted)).toBeLessThanOrEqual(4_000);
        expect(fitted.logs.at(0)).toMatchObject({
            text: expect.stringContaining('line 0 ') as string,
        });
        expect(fitted.logs.at(-1)).toEqual({ level: 'warn', notice: 'note-cut' });
        expect(wsScriptNoteSchema.parse(fitted)).toEqual(fitted);
    });

    it('halves the cases once the lines are gone, keeping the first ones', () => {
        const cases = {
            ...note,
            logs: [],
            tests: Array.from({ length: 200 }, (_, index) => ({
                name: `case ${String(index)} ${'z'.repeat(40)}`,
                passed: true,
            })),
        };
        const fitted = fitScriptNote(cases, 3_000);

        expect(weightOf(fitted)).toBeLessThanOrEqual(3_000);
        expect(fitted.tests.length).toBeLessThan(200);
        expect(fitted.tests.at(0)?.name).toContain('case 0 ');
        expect(fitted.logs).toEqual([{ level: 'warn', notice: 'note-cut' }]);
    });

    it('still says it cut when nothing it may drop is left', () => {
        const bare = { ...note, logs: [], tests: [] };

        expect(fitScriptNote(bare, 10)).toEqual({
            ...bare,
            logs: [{ level: 'warn', notice: 'note-cut' }],
        });
    });
});
