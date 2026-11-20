import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ImportSummaryCard } from '../../src/import/components/dialog/ImportSummaryCard.js';

import { AppProviders } from '../support/providers.js';

describe('the summary card of a loaded document', () => {
    it('names the document and offers the way to another one', () => {
        const onBrowse = vi.fn();

        render(<ImportSummaryCard name="Pasarela" onBrowse={onBrowse} />, {
            wrapper: AppProviders,
        });

        expect(screen.getByText('Pasarela')).toBeVisible();
        // A box of white on the dialog, never the grey of a panel.
        expect(screen.getByText('Pasarela').closest("[data-part='import-summary']")).toHaveClass(
            'bg-surface-raised',
        );

        fireEvent.click(screen.getByRole('button', { name: 'Browse' }));

        expect(onBrowse).toHaveBeenCalledTimes(1);
    });
});
