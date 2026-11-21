import { describe, expect, it } from 'vitest';

import { cssOf } from './theme-values.js';

/** The body of the rule written for exactly this selector, or nothing when there is none. */
function ruleFor(css: string, selector: string): string {
    const at = css.indexOf(`${selector} {`);
    const open = css.indexOf('{', at);
    const close = css.indexOf('}', open);

    return at === -1 ? '' : css.slice(open + 1, close);
}

/** One declaration of a rule, spaces folded, so a value the formatter broke over lines reads as one. */
function valueOf(rule: string, property: string): string {
    const value = new RegExp(`(?:^|[;\\s])${property}:([^;]+);`).exec(rule)?.[1] ?? '';

    return value.replaceAll(/\s+/g, ' ').replaceAll('( ', '(').replaceAll(' )', ')').trim();
}

const ROW =
    "[data-part='sidebar-content'] :is([data-part='tree-row'], [data-part='list-row'])[data-level]";

/** Where the box of a row of the lateral opens: on the row's own column, the search field's at level one. */
const BOX_START =
    'calc(var(--mandor-pad-inline-panel) + (attr(data-level type(<number>), 1) - 1) * var(--mandor-indent-tree))';

/** Where it closes: the same inset short of the end, so it never runs into the edge. */
const BOX_END = 'calc(var(--mandor-pad-inline-panel) - var(--mandor-pad-inline-control))';

/**
 * A row of the lateral lights a box of its own, the way the sidebar of Postman draws it, instead
 * of a band from edge to edge: the box opens on the column of the row and stops a little short of
 * the end, rounded on every corner.
 */
describe('the box a row of the lateral lights', () => {
    it('opens on the column of the row, stops short of the end and rounds every corner', async () => {
        const rule = ruleFor(await cssOf('runtime.css'), ROW);

        expect(valueOf(rule, 'margin-inline')).toBe(`${BOX_START} ${BOX_END}`);
        expect(valueOf(rule, 'border-radius')).toBe('var(--mandor-radius-xl)');
    });

    /**
     * The depth moves from the padding to the margin, so the margin is the old padding and the
     * box keeps none of its own at the start: nothing the row shows moves.
     */
    it('keeps what the row shows where it stood', async () => {
        const rule = ruleFor(await cssOf('runtime.css'), ROW);

        expect(valueOf(rule, 'padding-inline-start')).toBe('0');
    });

    /** A drop says where it lands in the same box the row lights, not across the whole lateral. */
    it('draws where a drop lands inside that same box', async () => {
        const runtime = await cssOf('runtime.css');
        const lines = ruleFor(
            runtime,
            "[data-part='collection-row'][data-drop='above']::after,\n[data-part='collection-row'][data-drop='below']::after",
        );
        const inside = ruleFor(runtime, "[data-part='collection-row'][data-drop='inside']::before");

        expect(valueOf(lines, 'inset-inline')).toBe(`${BOX_START} ${BOX_END}`);
        expect(valueOf(inside, 'inset-inline')).toBe(`${BOX_START} ${BOX_END}`);
        expect(valueOf(inside, 'border-radius')).toBe('var(--mandor-radius-xl)');
        expect(valueOf(inside, 'background')).toBe('var(--surface-accent-tint)');
    });
});
