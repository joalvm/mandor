import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NoEventOpen } from '../../../../src/renderer/features/connections/components/panel/NoEventOpen.js';

import { AppProviders } from '../../support/app-providers.js';

describe('a connection holding no event', () => {
    /** A composer with nothing to compose reads as a failure; one line reads as what it is. */
    it('says what is missing and where it is found', () => {
        render(<NoEventOpen />, { wrapper: AppProviders });

        expect(screen.getByText('Select an event from the collections')).toBeVisible();
        expect(
            screen.getByText(
                'The event you open is composed here and sent through this connection.',
            ),
        ).toBeVisible();
    });
});
