import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ExampleDiffSettled } from '../../../../../../src/renderer/features/requests/components/examples/ExampleDiffSettled.js';
import { AppProviders } from '../../../../support/app-providers.js';

afterEach(cleanup);

describe('the Differences tab once nothing differs (ExampleDiffSettled)', () => {
    it('says nothing differs and asks to send again for new changes', () => {
        render(<ExampleDiffSettled />, { wrapper: AppProviders });

        expect(screen.getByRole('heading', { name: 'No differences' })).toBeVisible();
        expect(screen.getByText('Send again to look for new changes.')).toBeVisible();
    });

    it('names the key that sends, and has no button of its own', () => {
        render(<ExampleDiffSettled />, { wrapper: AppProviders });

        expect(screen.getByText('Ctrl+Enter')).toBeVisible();
        expect(screen.queryByRole('button')).toBeNull();
    });
});
