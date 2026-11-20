import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { cssOf, declarationsOf, themeOf } from './theme-values.js';

/** The declarations of the rule that opens with exactly these selectors, or none. */
function ruleOf(css: string, selectors: string): string {
    const escaped = selectors.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    return new RegExp(`${escaped} \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
}

const HANDLES = ["[data-part='split-handle']", "[data-part='sidebar-handle']"] as const;

function bothHandles(state: string): string {
    return HANDLES.map((handle) => `${handle}${state}::before`).join(',\n');
}

describe('the line a divider draws', () => {
    /**
     * Pointed at or dragged, a divider turns into a thin blue line: blue because nothing else in
     * the window is that colour, so it reads as the one thing that moves, in either scheme.
     */
    it.each(['light', 'dark', 'light-contrast', 'dark-contrast'] as const)(
        'is the same blue in %s mode',
        async (mode) => {
            const theme = await themeOf(mode);

            expect(theme['border-handle']).toBe('#00a4f4');
        },
    );

    it('is two pixels thick once it shows', async () => {
        expect(declarationsOf(await cssOf('scales.css'))['mandor-width-handle']).toBe('2px');
    });

    /** A pointer passing over it on its way elsewhere paints nothing: it waits, then fades in. */
    it('waits a moment under the pointer before it fades in', async () => {
        const rule = ruleOf(await cssOf('runtime.css'), bothHandles(':hover'));

        expect(rule).toMatch(/background-color:\s*var\(--color-border-handle\)/);
        expect(rule).toMatch(/transition-delay:\s*var\(--mandor-delay-handle\)/);
    });

    /** A press is a grab: the line is there at once, whatever the wait of the pointer left. */
    it('shows at once while it is pressed', async () => {
        const rule = ruleOf(await cssOf('runtime.css'), bothHandles(':active'));

        expect(rule).toMatch(
            /background-image:\s*linear-gradient\(\s*var\(--color-border-handle\)/,
        );
    });

    it('draws the dividers of the grid with the same line', async () => {
        const grid = await readFile(
            join(process.cwd(), 'packages', 'shell', 'src', 'styles', 'grid.css'),
            'utf8',
        );

        expect(grid).toMatch(/--dv-active-sash-color:\s*var\(--border-handle\)/);
        expect(grid).toMatch(/--dv-active-sash-transition-delay:\s*var\(--mandor-delay-handle\)/);
    });
});
