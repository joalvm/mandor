import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DocView } from '../src/index.js';

import { AppProviders } from './support/app-providers.js';

function show(value: string): void {
    render(<DocView value={value} />, { wrapper: AppProviders });
}

/** The quotes of a doc (DocQuote), and the five alerts of GitHub written as quotes. */
describe('a quote of a doc', () => {
    it.each([
        ['NOTE', 'Note'],
        ['TIP', 'Tip'],
        ['IMPORTANT', 'Important'],
        ['WARNING', 'Warning'],
        ['CAUTION', 'Caution'],
    ])('reads `[!%s]` as the alert called %s', (mark, title) => {
        show(`> [!${mark}]\n> Caduca en una hora.\n`);

        const note = screen.getByRole('note');

        expect(within(note).getByText(title)).toBeVisible();
        expect(within(note).getByText('Caduca en una hora.')).toBeVisible();
        expect(screen.queryByText(`[!${mark}]`, { exact: false })).toBeNull();
    });

    it('stays a quote when its first line names no alert', () => {
        show('> Una cita de la guía.\n');

        expect(screen.queryByRole('note')).toBeNull();
        expect(screen.getByText('Una cita de la guía.')).toBeVisible();
    });
});
