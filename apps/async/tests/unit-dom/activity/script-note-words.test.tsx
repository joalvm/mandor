import { MessagesProvider, useMessages } from '@mandor/i18n';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
    scriptErrorPlace,
    scriptEventWords,
    scriptNoteFigures,
} from '../../../src/renderer/activity/lib/script-note-words.js';
import { scriptNoteOf } from '../support/activity-entries.js';

function labelsIn(language: 'en' | 'es') {
    const { result } = renderHook(() => useMessages('connections'), {
        wrapper: ({ children }) => (
            <MessagesProvider preferences={{ language }}>{children}</MessagesProvider>
        ),
    });

    return result.current;
}

describe('the words of a note of the scripts', () => {
    it('names each moment of a connection in the language of the interface', () => {
        const labels = labelsIn('es');

        expect(scriptEventWords('onBeforeConnect', labels)).toBe('Antes de conectar');
        expect(scriptEventWords('onConnect', labels)).toBe('Al conectar');
        expect(scriptEventWords('onMessage', labelsIn('en'))).toBe('On messages');
    });

    it('says where the script stopped: the moment, and the line when it was told', () => {
        const labels = labelsIn('es');
        const error = { message: 'boom', errorName: 'Error' };

        expect(scriptErrorPlace(scriptNoteOf({ error: { ...error, line: 3 } }), labels)).toBe(
            'Antes de conectar · línea 3',
        );
        expect(scriptErrorPlace(scriptNoteOf({ event: 'onMessage', error }), labels)).toBe(
            'Con los mensajes',
        );
    });

    it('says only the moment of a note whose figures are all zero', () => {
        expect(scriptNoteFigures(scriptNoteOf(), labelsIn('es'))).toBe('Antes de conectar');
    });

    it('puts every figure that is not zero after the moment, in one line', () => {
        const note = scriptNoteOf({
            event: 'onMessage',
            logs: [{ level: 'log', text: 'a' }],
            tests: [
                { name: 'one', passed: true },
                { name: 'two', passed: false },
            ],
            skipped: [{ name: 'guard', level: 'connection', event: 'onMessage', bytes: 10 }],
            dropped: 4,
            switchedOff: 2,
            secretsOff: 'polling',
            error: { message: 'boom', errorName: 'Error' },
        });

        expect(scriptNoteFigures(note, labelsIn('es'))).toBe(
            'Con los mensajes · 1 línea · tests 1/2 · 1 sin aprobar · 4 descartados · 2 apagados · sin secretos · falló',
        );
    });
});
