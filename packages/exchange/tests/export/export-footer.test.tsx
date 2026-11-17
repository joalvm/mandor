import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExportFooter } from '../../src/export/components/dialog/ExportFooter.js';

import { AppProviders } from '../support/providers.js';

describe('the footer of the export', () => {
    it('offers the go once there is a document', () => {
        const onSave = vi.fn();

        render(<ExportFooter disabled={false} onSave={onSave} saving={false} />, {
            wrapper: AppProviders,
        });
        fireEvent.click(screen.getByRole('button', { name: 'Export' }));

        expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('does not offer the go while there is nothing to write', () => {
        const onSave = vi.fn();

        render(<ExportFooter disabled onSave={onSave} saving={false} />, {
            wrapper: AppProviders,
        });

        expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
    });

    it('does not offer the go twice while the writing is under way', () => {
        const onSave = vi.fn();

        render(<ExportFooter disabled={false} onSave={onSave} saving />, {
            wrapper: AppProviders,
        });

        expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
    });
});
