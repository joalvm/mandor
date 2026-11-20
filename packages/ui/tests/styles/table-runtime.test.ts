import { describe, expect, it } from 'vitest';

import { cssOf } from './theme-values.js';

/** The declarations of the rule written for exactly this selector, once spaces are folded. */
function ruleFor(css: string, selector: string): string {
    for (const [, written = '', body = ''] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (written.replace(/\s+/g, ' ').trim().endsWith(selector)) {
            return body;
        }
    }

    return '';
}

const ALWAYS = "[data-part='table-row-actions'][data-reveal='always']";

/**
 * The actions of a row that asks to keep them in sight stand there at rest, and what lies under
 * them ends where they begin at rest too, not only while the row is being written.
 */
describe('the actions a row keeps in sight', () => {
    it('shows them at rest', async () => {
        const table = await cssOf('table.css');

        expect(ruleFor(table, `[data-part='table'] ${ALWAYS}`)).toContain('opacity: 1');
    });

    it('ends the cell under them where they begin, at rest', async () => {
        const table = await cssOf('table.css');

        expect(ruleFor(table, `[data-part='table'] tr > :has(+ ${ALWAYS})`)).toContain(
            '--table-cell-covered: var(--table-row-actions-width, 0px)',
        );
    });
});
