import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useRowHeight } from '../../src/hooks/useRowHeight.js';
import { scaleTokenValues } from '../../src/styles/token-scale-values.js';

const COMFORTABLE = Number.parseFloat(scaleTokenValues['mandor-height-row']);

function Height() {
    return <output aria-label="Row">{useRowHeight()}</output>;
}

function shown(): string {
    return screen.getByRole('status', { name: 'Row' }).textContent;
}

const sheets: HTMLStyleElement[] = [];

/** The sheet of the compact density, as `scales.css` writes it. */
function compactSheet(): void {
    const sheet = document.createElement('style');

    sheet.textContent = ":root[data-density='compact'] { --mandor-height-row: 22px; }";
    document.head.append(sheet);
    sheets.push(sheet);
}

async function densityIs(density: string | undefined): Promise<void> {
    await act(async () => {
        if (density === undefined) {
            document.documentElement.removeAttribute('data-density');
        } else {
            document.documentElement.dataset['density'] = density;
        }

        await Promise.resolve();
    });
}

afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('data-density');

    for (const sheet of sheets.splice(0)) {
        sheet.remove();
    }
});

describe('the height of a line of the scale (useRowHeight)', () => {
    it('is the row of the scale while no stylesheet says otherwise', () => {
        render(<Height />);

        expect(shown()).toBe(String(COMFORTABLE));
    });

    it('follows the density the window is drawn in, there and back', async () => {
        compactSheet();
        render(<Height />);

        await densityIs('compact');

        expect(shown()).toBe('22');

        await densityIs(undefined);

        expect(shown()).toBe(String(COMFORTABLE));
    });

    it('reads the density the window already had when the list opens', () => {
        compactSheet();
        document.documentElement.dataset['density'] = 'compact';

        render(<Height />);

        expect(shown()).toBe('22');
    });
});
