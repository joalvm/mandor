import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { tokenValues } from '../../src/styles/token-values.js';
import { cssOf, declarationsOf } from './theme-values.js';

/** What the compact density changes, and nothing else: the gutter, the radius, the strip, the row. */
const COMPACT = {
    'mandor-gap-gutter': '0px',
    'mandor-height-grid-tab': '30px',
    'mandor-height-row': '22px',
    'mandor-height-strip': '32px',
    'mandor-radius-panel': '0px',
} as const;

/** The grid lives in the shell, which dresses the library the tabs come from. */
const GRID = join(process.cwd(), 'packages', 'shell', 'src', 'styles', 'grid.css');

function compactBlockOf(css: string): string {
    return /:root\[data-density='compact'\]\s*{([^}]*)}/.exec(css)?.[1] ?? '';
}

describe('the compact density', () => {
    it('packs the panels together and changes only the gutter, the radius, the strip and the row', async () => {
        expect(declarationsOf(compactBlockOf(await cssOf('scales.css')))).toEqual(COMPACT);
    });

    it('leaves the values the code reads at the comfortable density', () => {
        expect(tokenValues.scales).toMatchObject({
            'mandor-gap-gutter': '8px',
            'mandor-height-grid-tab': '28px',
            'mandor-height-row': '24px',
            'mandor-height-strip': '38px',
            'mandor-radius-panel': '10px',
        });
    });

    it('squares the tab, draws the line under the strip and parts two cards with a line', async () => {
        const grid = await readFile(GRID, 'utf8');
        const runtime = await cssOf('runtime.css');

        expect(grid).toMatch(
            /\[data-density='compact'\][^{]*\.dv-tab[^{]*{[^}]*border-radius:\s*0/,
        );
        expect(grid).toMatch(
            /\[data-density='compact'\][^{]*tabs-and-actions-container[^{]*{[^}]*border-block-end/,
        );
        expect(runtime).toMatch(
            /\[data-density='compact'\][^{]*\[data-part='card'\][^{]*{[^}]*--color-border-subtle/,
        );
    });
});

/** Without a line the card never quite ends on the frame; packed, the lines between cards do it. */
describe('the edge of a card', () => {
    it('closes every card with a faint line, and lets the compact density drop it', async () => {
        const runtime = await cssOf('runtime.css');

        expect(runtime).toMatch(
            /^\[data-part='card'\]\s*{\s*border:\s*1px solid var\(--color-border-subtle\)/m,
        );
        expect(runtime).toMatch(
            /\[data-density='compact'\]\s*\[data-part='card'\]\s*{\s*border-width:\s*0/,
        );
    });
});
