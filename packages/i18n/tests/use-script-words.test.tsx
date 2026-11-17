import { renderHook } from '@testing-library/react';
import { MessagesProvider, useScriptWords, type ScriptWords } from '@mandor/i18n';
import { describe, expect, it } from 'vitest';

function wordsIn(language: 'en' | 'es'): ScriptWords {
    const { result } = renderHook(() => useScriptWords(), {
        wrapper: ({ children }) => (
            <MessagesProvider preferences={{ language }}>{children}</MessagesProvider>
        ),
    });

    return result.current;
}

describe('useScriptWords', () => {
    it('keeps a line a script wrote as it wrote it', () => {
        expect(wordsIn('es').line({ level: 'log', text: 'hello' })).toBe('hello');
    });

    it('says what main said in the language of the interface, with what it said it with', () => {
        const words = wordsIn('es');

        expect(
            words.line({ level: 'warn', notice: 'secret-unreadable', params: { name: 'token' } }),
        ).toBe('La variable «token» es un secreto: un script no puede leerla.');
        expect(words.line({ level: 'warn', notice: 'note-cut' })).toBe(
            'Lo que dijeron los scripts era demasiado largo: se cortó el resto.',
        );
        expect(wordsIn('en').line({ level: 'warn', notice: 'no-reconnect' })).toBe(
            'A script ran before this connection opened: it does not reconnect on its own.',
        );
    });

    it('counts in the singular and the plural', () => {
        const words = wordsIn('es');

        expect(words.line({ level: 'warn', notice: 'queue-full', params: { count: 1 } })).toBe(
            'Llegó 1 mensaje con la cola llena: ningún script corrió sobre él.',
        );
        expect(words.line({ level: 'warn', notice: 'queue-full', params: { count: 3 } })).toBe(
            'Llegaron 3 mensajes con la cola llena: ningún script corrió sobre ellos.',
        );
    });

    it('says an error of main in its words, with the limit when main told it', () => {
        const words = wordsIn('es');

        expect(words.error({ message: 'ran long', errorName: 'Timeout', limit: 300 })).toBe(
            'El script corrió más de 300 ms',
        );
        expect(words.error({ message: 'ran long', errorName: 'Timeout' })).toBe(
            'Al script se le acabó el tiempo',
        );
        expect(words.error({ message: 'gone', errorName: 'WorkerDied' })).toBe(
            'El worker del script se detuvo',
        );
    });

    it('says an error the script threw as it threw it', () => {
        expect(
            wordsIn('es').error({ message: 'x is not defined', errorName: 'ReferenceError' }),
        ).toBe('ReferenceError: x is not defined');
    });
});
