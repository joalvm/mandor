import type { PropsWithChildren, ReactNode } from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RowLabel } from '../../../src/components/row/RowLabel.js';
import { RowNameProvider, useRowNameId } from '../../../src/components/row/row-name.js';

function RowWrapper({ children }: PropsWithChildren): ReactNode {
    return <RowNameProvider value="gateway-row">{children}</RowNameProvider>;
}

describe('the name a row keeps', () => {
    it('offers nothing to a label that stands outside a row', () => {
        const { result } = renderHook(() => useRowNameId());

        expect(result.current).toBeUndefined();
    });

    it('hands the row the id its label has to carry', () => {
        const { result } = renderHook(() => useRowNameId(), { wrapper: RowWrapper });

        expect(result.current).toBe('gateway-row');
    });

    it('is what the label inside the row is announced by', () => {
        render(
            <RowWrapper>
                <RowLabel>pasarela de pagos</RowLabel>
            </RowWrapper>,
        );

        const label = screen.getByTitle('pasarela de pagos');

        expect(label).toHaveAttribute('id', 'gateway-row');
        expect(label).toHaveAttribute('data-part', 'row-label');
    });
});
