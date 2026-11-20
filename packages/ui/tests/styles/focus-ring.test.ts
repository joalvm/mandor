import { describe, expect, it } from 'vitest';

import { cssOf } from './theme-values.js';

/**
 * Teal over teal is no ring: a fill that owns the accent cannot take it back as its ring.
 * focus.css routes the frames of filled controls to the colour their own label wears — the
 * pair the theme already guarantees against that fill — and an invalid field keeps its error
 * line under focus, so the signal never blinks out mid-typing.
 */
describe('the ring over filled frames', () => {
    it('routes filled frames to the colour of their own label', async () => {
        const css = await cssOf('focus.css');

        for (const selector of [
            "[data-focus-frame][data-variant='primary']:focus-visible",
            "[data-focus-frame][data-variant='danger']:focus-visible",
            "[data-part='switch'][data-state='checked']:focus-visible",
            "[data-part='checkbox'][data-state='checked']:focus-visible",
            "[data-part='checkbox'][data-state='indeterminate']:focus-visible",
        ]) {
            expect(css, selector).toContain(selector);
        }

        expect(css).toContain('var(--text-on-solid-accent)');
        expect(css).toContain('var(--text-on-solid-danger)');
        expect(css).toContain('[aria-invalid');
    });
});

/**
 * A row, a notice and a section tab are reached by the keyboard the way a click reaches them: the
 * one the focus rests on wears the grey of the selected line, and none of them draws a line.
 */
describe('the focus of rows and tabs', () => {
    it('lays the grey of the selection over them instead of a line', async () => {
        const css = await cssOf('focus.css');
        const rule = /:is\(([^)]*\)[^)]*)\):focus-visible\s*\{([^}]*)\}/.exec(css);

        expect(rule?.[2]).toContain('background-color: var(--surface-selected)');

        for (const part of ['list-row', 'tree-row', 'notice', 'tabs-trigger']) {
            expect(rule?.[1], part).toContain(`[data-part='${part}']`);
        }
    });
});
