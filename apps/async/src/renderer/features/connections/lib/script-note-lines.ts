import type { ScriptWords, useMessages } from '@mandor/i18n';
import type { WsScriptNote } from '@mandor/ipc';
import type { LogLine } from '@mandor/ui';

import { scriptErrorPlace } from '../../../activity/lib/script-note-words.js';

type Labels = ReturnType<typeof useMessages<'connections'>>;

/** The runs the switch of this machine stopped, said once for the note. */
function switchedOffLines(note: WsScriptNote, labels: Labels, prefix: string): LogLine[] {
    if (note.switchedOff === 0) {
        return [];
    }

    return [
        {
            key: `${prefix}-off`,
            tone: 'note',
            text: labels('scriptSwitchedOff', { count: note.switchedOff }),
        },
    ];
}

/** Each case the scripts named, held or broken, with why when they told it. */
function caseLines(note: WsScriptNote, labels: Labels, prefix: string): LogLine[] {
    return note.tests.map((test, index) => {
        const word = labels(test.passed ? 'scriptTestPassed' : 'scriptTestFailed');

        return {
            key: `${prefix}-case-${String(index)}`,
            tone: test.passed ? 'passed' : 'failed',
            text: test.name,
            detail: test.message === undefined ? word : `${word}: ${test.message}`,
        };
    });
}

/**
 * What one note of a connection writes to the console of the window: the runs that did not
 * happen, what the scripts wrote in order, their cases, and last where the one that broke
 * stopped. Every key carries the moment of the note, so the notes of a connection sit under one
 * heading apart. What main said in place of a script is said in the language of the interface.
 */
export function scriptNoteLines(note: WsScriptNote, labels: Labels, words: ScriptWords): LogLine[] {
    const prefix = String(note.at);
    const written = note.logs.map((log, index): LogLine => ({
        key: `${prefix}-log-${String(index)}`,
        tone: log.level,
        text: words.line(log),
    }));
    const broke = (note.error === undefined ? [] : [note.error]).map((error): LogLine => ({
        key: `${prefix}-error`,
        tone: 'error',
        text: words.error(error),
        detail: scriptErrorPlace(note, labels),
    }));

    return [
        ...switchedOffLines(note, labels, prefix),
        ...written,
        ...caseLines(note, labels, prefix),
        ...broke,
    ];
}
