import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ImportFooter } from '../../src/import/components/dialog/ImportFooter.js';

import { AppProviders } from '../support/providers.js';

describe('the import footer', () => {
    it('offers the go, and nothing else to read before it', () => {
        const onApply = vi.fn();

        render(<ImportFooter applying={false} disabled={false} onApply={onApply} />, {
            wrapper: AppProviders,
        });
        fireEvent.click(screen.getByRole('button', { name: 'Import' }));

        expect(onApply).toHaveBeenCalledTimes(1);
    });

    it('keeps the go out of reach while there is nothing to write', () => {
        render(<ImportFooter applying={false} disabled onApply={vi.fn()} />, {
            wrapper: AppProviders,
        });

        expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
    });

    it('does not offer the go twice while the writing is under way', () => {
        render(<ImportFooter applying disabled={false} onApply={vi.fn()} />, {
            wrapper: AppProviders,
        });

        expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
    });
});
