import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DocView } from '../src/index.js';

import { AppProviders } from './support/app-providers.js';

/**
 * The markdown a repo carries is the markdown of forges: tables, checkboxes and notes are written
 * without asking whether the renderer of this app understands them.
 */
describe('the markdown of a repo', () => {
    it('renders a table with its headers', () => {
        render(
            <DocView
                value={'| Campo | Tipo |\n| --- | --- |\n| id | texto |\n| edad | número |\n'}
            />,
            { wrapper: AppProviders },
        );

        expect(screen.getByRole('table')).toBeVisible();
        expect(screen.getByRole('columnheader', { name: 'Campo' })).toBeVisible();
        expect(screen.getByRole('cell', { name: 'número' })).toBeVisible();
    });

    /** A task list is read, never ticked: the doc is the source, and it is edited as text. */
    it('renders a task list as boxes nobody can tick', () => {
        render(<DocView value={'- [x] hecho\n- [ ] pendiente\n'} />, { wrapper: AppProviders });

        const boxes = screen.getAllByRole('checkbox');

        expect(boxes).toHaveLength(2);
        expect(boxes[0]).toBeChecked();
        expect(boxes[0]).toBeDisabled();
    });

    it('renders the text of a footnote', () => {
        render(<DocView value={'El campo caduca[^1].\n\n[^1]: A los treinta días.\n'} />, {
            wrapper: AppProviders,
        });

        expect(screen.getByText(/A los treinta días\./)).toBeVisible();
    });
});
