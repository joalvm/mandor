import { render, renderHook } from '@testing-library/react';
import { MessagesProvider, useLanguage } from '@mandor/i18n';
import { useEffect, useState, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

function LanguageSource({ children, language }: { children: ReactNode; language: string }) {
    const [current, setCurrent] = useState(language);

    useEffect(() => {
        setCurrent(language);
    }, [language]);

    return <MessagesProvider preferences={{ language: current }}>{children}</MessagesProvider>;
}

function Harness(): ReactNode {
    const language = useLanguage();

    return <span lang={language}>{language}</span>;
}

describe('useLanguage', () => {
    it('reads back the language the provider is speaking', () => {
        const { result } = renderHook(() => useLanguage(), {
            wrapper: ({ children }) => (
                <MessagesProvider preferences={{ language: 'es' }}>{children}</MessagesProvider>
            ),
        });

        expect(result.current).toBe('es');
    });

    it('answers in the provisioned language when no preference says otherwise', () => {
        const { result } = renderHook(() => useLanguage(), {
            wrapper: ({ children }) => (
                <MessagesProvider preferences={{}}>{children}</MessagesProvider>
            ),
        });

        expect(result.current).toBe('en');
    });

    it.each([
        ['fr', 'en'],
        ['es-ES', 'es'],
    ])('answers %s with the language the interface speaks for it, %s', (preference, spoken) => {
        const { result } = renderHook(() => useLanguage(), {
            wrapper: ({ children }) => (
                <MessagesProvider preferences={{ language: preference }}>
                    {children}
                </MessagesProvider>
            ),
        });

        expect(result.current).toBe(spoken);
    });

    it('stays in step when the preference changes under a mounted tree', () => {
        const view = render(
            <LanguageSource language="en">
                <Harness />
            </LanguageSource>,
        );

        expect(view.getByText('en')).toBeDefined();

        view.rerender(
            <LanguageSource language="es">
                <Harness />
            </LanguageSource>,
        );

        expect(view.getByText('es')).toBeDefined();
    });
});
