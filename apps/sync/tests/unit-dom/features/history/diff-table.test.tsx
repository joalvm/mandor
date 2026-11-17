import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DiffTable } from '../../../../src/renderer/features/history/components/diff/DiffTable.js';
import { AppProviders } from '../../support/app-providers.js';

afterEach(cleanup);

describe('the table both comparisons share', () => {
    it('names the rows for a screen reader and heads the earlier and the later column', () => {
        render(<DiffTable label="Summary" />, { wrapper: AppProviders });

        expect(screen.getByRole('table', { name: 'Summary' })).toBeVisible();
        expect(screen.getAllByRole('columnheader')).toHaveLength(3);
        expect(screen.getByText('Summary')).toHaveClass('sr-only');
        expect(screen.getByRole('columnheader', { name: 'Earlier' })).toBeVisible();
        expect(screen.getByRole('columnheader', { name: 'Later' })).toBeVisible();
    });
});
