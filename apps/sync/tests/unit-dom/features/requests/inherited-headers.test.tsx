import type { InheritedHeader } from '@mandor/schema';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { InheritedHeaders } from '../../../../src/renderer/features/requests/components/headers/InheritedHeaders.js';
import { AppProviders } from '../../support/app-providers.js';

const STANDING: InheritedHeader = {
    label: 'Pedidos',
    line: { enabled: true, key: 'X-Tenant', value: 'acme' },
};

function draw(headers: readonly InheritedHeader[]): void {
    render(<InheritedHeaders headers={headers} />, { wrapper: AppProviders });
}

function unfold(count: number): void {
    fireEvent.click(screen.getByRole('button', { name: `Inherited (${String(count)})` }));
}

afterEach(cleanup);

describe('the headers a request inherits, under its table', () => {
    it('draws nothing while no level hands a header down', () => {
        draw([]);

        expect(screen.queryByRole('button', { name: /Inherited/u })).toBeNull();
    });

    it('stays folded behind its count until asked for', () => {
        draw([STANDING]);

        expect(screen.queryByText('X-Tenant')).toBeNull();

        unfold(1);

        expect(screen.getByText('X-Tenant')).toBeVisible();
    });

    it('says the name, the value and the level that declared it', () => {
        draw([STANDING]);
        unfold(1);

        expect(screen.getByText('acme')).toBeVisible();
        expect(screen.getByText('Pedidos')).toBeVisible();
    });

    it('does not strike a header that goes out', () => {
        draw([STANDING]);
        unfold(1);

        expect(screen.getByText('X-Tenant')).not.toHaveClass('line-through');
        expect(screen.queryByText(/overridden by/u)).toBeNull();
    });

    it('strikes a header a closer level overrides, and names that level', () => {
        draw([{ ...STANDING, overriddenBy: { by: 'level', name: 'Altas' } }]);
        unfold(1);

        expect(screen.getByText('X-Tenant')).toHaveClass('line-through');
        expect(screen.getByText('acme')).toHaveClass('line-through');
        expect(screen.getByText('overridden by Altas')).toBeVisible();
    });

    it('says so when the request itself overrides it', () => {
        draw([{ ...STANDING, overriddenBy: { by: 'request' } }]);
        unfold(1);

        expect(screen.getByText('overridden by this request')).toBeVisible();
    });
});
