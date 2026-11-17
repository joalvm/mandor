import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ExampleDiffEmpty } from '../../../../../../src/renderer/features/requests/components/examples/ExampleDiffEmpty.js';
import { AppProviders } from '../../../../support/app-providers.js';

afterEach(cleanup);

describe('the Differences tab before anything was compared (ExampleDiffEmpty)', () => {
    it('says it is not checked and how to check it', () => {
        render(<ExampleDiffEmpty />, { wrapper: AppProviders });

        expect(screen.getByRole('heading', { name: 'Not checked yet' })).toBeVisible();
        expect(screen.getByText(/^Send the request to compare/u)).toBeVisible();
    });

    it('lists the three steps and the key that sends', () => {
        render(<ExampleDiffEmpty />, { wrapper: AppProviders });

        const steps = screen.getAllByRole('listitem').map((step) => step.textContent);

        expect(steps).toContain('SendCtrl+Enter');
        expect(steps).toContain('Review');
        expect(steps).toContain('Accept');
        expect(screen.queryByRole('button')).toBeNull();
    });
});
