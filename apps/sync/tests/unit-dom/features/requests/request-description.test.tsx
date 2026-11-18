import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RequestDescription } from '../../../../src/renderer/features/requests/components/panel/RequestDescription.js';
import { AppProviders } from '../../support/app-providers.js';

function describeRequest(): void {
    render(
        <RequestDescription
            onChange={() => undefined}
            resource="w/local/crear-pedido"
            value="# Para qué"
        />,
        { wrapper: AppProviders },
    );
}

describe('the description of a request', () => {
    /** A description is read far more often than it is written. */
    it('opens on its page', () => {
        describeRequest();

        expect(screen.getByRole('heading', { level: 1, name: 'Para qué' })).toBeVisible();
        expect(screen.queryByRole('group', { name: 'Description' })).toBeNull();
    });

    it('opens the markdown of the doc under a model of its own resource', () => {
        describeRequest();

        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

        expect(screen.getByRole('group', { name: 'Description' })).toHaveAttribute(
            'data-language',
            'markdown',
        );
    });
});
