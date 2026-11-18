import type { PropsWithChildren, ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FieldWiringProvider, useFieldWiring } from '../../../src/components/input/field-wiring.js';

const FIELD = { describedBy: 'url-help', id: 'url', invalid: true } as const;

function FieldWrapper({ children }: PropsWithChildren): ReactNode {
    return <FieldWiringProvider value={{ ...FIELD }}>{children}</FieldWiringProvider>;
}

describe('the wiring a control runs with', () => {
    it('stands alone outside a field, with no invalid state of its own', () => {
        const { result } = renderHook(() => useFieldWiring({}));

        expect(result.current).toEqual({ describedBy: undefined, id: undefined, invalid: false });
    });

    it('takes the id, the message and the invalid state of the field it stands in', () => {
        const { result } = renderHook(() => useFieldWiring({}), { wrapper: FieldWrapper });

        expect(result.current).toEqual({ describedBy: 'url-help', id: 'url', invalid: true });
    });

    it('keeps what the control was handed over what the field asks for', () => {
        const { result } = renderHook(
            () => useFieldWiring({ describedBy: 'own-help', id: 'own-id', invalid: false }),
            { wrapper: FieldWrapper },
        );

        expect(result.current).toEqual({ describedBy: 'own-help', id: 'own-id', invalid: false });
    });

    it('mixes what it was handed with what the field still owes it', () => {
        const { result } = renderHook(() => useFieldWiring({ id: 'own-id' }), {
            wrapper: FieldWrapper,
        });

        expect(result.current).toEqual({ describedBy: 'url-help', id: 'own-id', invalid: true });
    });
});
