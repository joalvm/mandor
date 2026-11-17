import { MessagesProvider, useMessages, useScriptWords } from '@mandor/i18n';
import type { WsScriptNote } from '@mandor/ipc';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { scriptNoteLines } from '../../../../../src/renderer/features/connections/lib/script-note-lines.js';
import { scriptNoteOf } from '../../../support/activity-entries.js';

function linesIn(language: 'en' | 'es', note: WsScriptNote) {
    const { result } = renderHook(
        () => ({ labels: useMessages('connections'), words: useScriptWords() }),
        {
            wrapper: ({ children }) => (
                <MessagesProvider preferences={{ language }}>{children}</MessagesProvider>
            ),
        },
    );

    return scriptNoteLines(note, result.current.labels, result.current.words);
}

describe('the lines a note of the scripts writes to the console', () => {
    it('writes nothing for a note that says nothing', () => {
        expect(linesIn('en', scriptNoteOf())).toEqual([]);
    });

    it('writes what the scripts wrote in order, and what main said in the interface words', () => {
        const note = scriptNoteOf({
            at: 7,
            logs: [
                { level: 'info', text: 'ready' },
                { level: 'warn', notice: 'no-reconnect' },
            ],
        });

        expect(linesIn('es', note)).toEqual([
            { key: '7-log-0', tone: 'info', text: 'ready' },
            {
                key: '7-log-1',
                tone: 'warn',
                text: 'Un script corrió antes de abrir esta conexión: no se reconecta sola.',
            },
        ]);
    });

    it('says first the runs the switch of this machine stopped', () => {
        const lines = linesIn('en', scriptNoteOf({ at: 1, switchedOff: 2 }));

        expect(lines).toEqual([
            { key: '1-off', tone: 'note', text: 'Scripts are off: 2 did not run' },
        ]);
    });

    it('writes each case, held or broken, with why when the script told it', () => {
        const note = scriptNoteOf({
            at: 1,
            tests: [
                { name: 'has ticket', passed: true },
                { name: 'is fresh', passed: false, message: 'expected 1 to be 2' },
            ],
        });

        expect(linesIn('es', note)).toEqual([
            { key: '1-case-0', tone: 'passed', text: 'has ticket', detail: 'Pasó' },
            {
                key: '1-case-1',
                tone: 'failed',
                text: 'is fresh',
                detail: 'Falló: expected 1 to be 2',
            },
        ]);
    });

    it('ends with where the script that broke stopped', () => {
        const note = scriptNoteOf({
            at: 1,
            event: 'onMessage',
            logs: [{ level: 'log', text: 'before' }],
            error: { message: 'x is not defined', errorName: 'ReferenceError', line: 3 },
        });
        const lines = linesIn('en', note);

        expect(lines.at(-1)).toEqual({
            key: '1-error',
            tone: 'error',
            text: 'ReferenceError: x is not defined',
            detail: 'On messages · line 3',
        });
        expect(lines).toHaveLength(2);
    });
});
