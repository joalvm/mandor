import { renderHook } from '@testing-library/react';
import { MessagesProvider, useEditorIssueMessage } from '@mandor/i18n';
import { describe, expect, it } from 'vitest';

type Said = ReturnType<typeof useEditorIssueMessage>;

function inSpanish(): Said {
    const { result } = renderHook(() => useEditorIssueMessage(), {
        wrapper: ({ children }) => (
            <MessagesProvider preferences={{ language: 'es' }}>{children}</MessagesProvider>
        ),
    });

    return result.current;
}

describe('useEditorIssueMessage', () => {
    it('says a rule of the schema in the language of the interface, with what it asked', () => {
        const said = inSpanish();

        expect(
            said('must be string', {
                keyword: 'type',
                params: { expected: 'string', received: 'integer' },
            }),
        ).toBe('debe ser string; es integer');
        expect(
            said("must have required property 'id'", {
                keyword: 'required',
                params: { property: 'id' },
            }),
        ).toBe("falta la propiedad obligatoria 'id'");
    });

    it('says a closed object the same whichever word of closing refused the key', () => {
        const said = inSpanish();
        const rule = { params: { property: 'extra' } };

        expect(said('', { ...rule, keyword: 'additionalProperties' })).toBe(
            said('', { ...rule, keyword: 'unevaluatedProperties' }),
        );
    });

    /** The margin is read by whoever is writing the payload, syntax and shape alike. */
    it('says what the parser found broken in the syntax in the language of the interface', () => {
        const said = inSpanish();

        expect(said('Value expected')).toBe('Falta el valor');
    });

    it('leaves a reply it does not know in the words of the parser', () => {
        const said = inSpanish();

        expect(said('unclosed tag: b')).toBe('unclosed tag: b');
        expect(said('must be shiny', { keyword: 'shiny', params: {} })).toBe('must be shiny');
    });
});
