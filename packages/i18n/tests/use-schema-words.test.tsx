import { renderHook } from '@testing-library/react';
import { MessagesProvider, useSchemaWords } from '@mandor/i18n';
import { describe, expect, it } from 'vitest';

function inSpanish(): ReturnType<typeof useSchemaWords> {
    const { result } = renderHook(() => useSchemaWords(), {
        wrapper: ({ children }) => (
            <MessagesProvider preferences={{ language: 'es' }}>{children}</MessagesProvider>
        ),
    });

    return result.current;
}

describe('useSchemaWords', () => {
    it('says each broken rule in the language of the interface, under a band that counts them', () => {
        const list = inSpanish().issues('Recibida 200', [
            {
                keyword: 'required',
                message: "must have required property 'id'",
                params: { property: 'id' },
                path: '',
                schemaPath: '/required/0',
            },
        ]);

        const { line, ...words } = list;

        expect(line(23)).toBe('Lín. 23');
        expect(words).toEqual({
            expected: 'esperado',
            received: 'recibido',
            resize: 'Redimensionar el schema y sus problemas',
            rows: [
                {
                    keyword: 'required',
                    message: "falta la propiedad obligatoria 'id'",
                    params: { property: 'id' },
                    path: '',
                    schemaPath: '/required/0',
                },
            ],
            title: 'Recibida 200 · 1 problema',
        });
        expect(inSpanish().issues('Payload', []).title).toBe('Payload · 0 problemas');
    });

    it('names the options of a schema in the language of the interface', () => {
        expect(inSpanish().pane.settings.closed).toBe('Rechazar propiedades no declaradas');
    });

    it('says that a pattern is left out of every check, and why', () => {
        expect(inSpanish().pane.uncheckedPattern).toBe(
            'Este pattern no se comprueba: un texto armado contra él podría colgar la app.',
        );
    });
});
