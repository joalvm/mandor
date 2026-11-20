import { IconButton } from '@mandor/ui';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { RequestBreadcrumb } from '../../../../src/renderer/features/requests/components/bar/RequestBreadcrumb.js';
import { AppProviders } from '../../support/app-providers.js';

afterEach(cleanup);

describe('the trail over the url bar', () => {
    it('lists the collection and the folders, and marks the request as the current page', () => {
        render(<RequestBreadcrumb name="Crear pedido" trail={['Tienda', 'Pedidos']} />, {
            wrapper: AppProviders,
        });

        const nav = screen.getByRole('region', { name: 'Where this request is' });

        expect(nav).toHaveTextContent('TiendaPedidosCrear pedido');
        expect(screen.getByText('Crear pedido')).toHaveAttribute('aria-current', 'page');
    });

    it('leads with the protocol the request speaks', () => {
        render(<RequestBreadcrumb name="Login" trail={['Tienda']} />, { wrapper: AppProviders });

        const lead = document.querySelector('[data-part="breadcrumbs-lead"]');

        expect(lead?.querySelector('svg')).not.toBeNull();
    });

    it('is only the name when nothing is known above the request', () => {
        render(<RequestBreadcrumb name="Login" trail={[]} />, { wrapper: AppProviders });

        expect(screen.getByRole('region', { name: 'Where this request is' })).toHaveTextContent(
            'Login',
        );
    });

    /** The row of the trail is lower than a band: the address below is what the eye looks for. */
    it('takes the height of a crumb row', () => {
        render(<RequestBreadcrumb name="Login" trail={[]} />, { wrapper: AppProviders });

        expect(document.querySelector('[data-part="request-breadcrumb"]')).toHaveClass('h-crumb');
    });

    it('holds the actions of the request at its end', () => {
        render(
            <RequestBreadcrumb name="Login" trail={[]}>
                <IconButton icon="code" label="Code" />
            </RequestBreadcrumb>,
            { wrapper: AppProviders },
        );

        expect(
            screen.getByRole('button', { name: 'Code' }).closest('[data-part="request-actions"]'),
        ).not.toBeNull();
    });
});
