import { renderHook } from '@testing-library/react';
import { MessagesProvider } from '@mandor/i18n';
import { describe, expect, it } from 'vitest';

import { useTranslator } from '../../src/hooks/useTranslator.js';

function translatorIn(language: 'en' | 'es') {
    return renderHook(() => useTranslator(), {
        wrapper: ({ children }) => (
            <MessagesProvider preferences={{ language }}>{children}</MessagesProvider>
        ),
    });
}

describe('useTranslator', () => {
    it('says a key that carries its own namespace in the language of the window', () => {
        expect(translatorIn('en').result.current('menu:quit')).toBe('Quit');
        expect(translatorIn('es').result.current('menu:quit')).toBe('Salir');
    });

    it('fills the values into the message', () => {
        const { result } = translatorIn('en');

        expect(result.current('menu:aboutApp', { name: 'Mandor' })).toBe('About Mandor');
    });

    it('keeps the same translator between renders', () => {
        const { rerender, result } = translatorIn('en');
        const first = result.current;

        rerender();

        expect(result.current).toBe(first);
    });
});
