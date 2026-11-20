import { describe, expect, it } from 'vitest';

import { cssOf } from './theme-values.js';

/** The declarations of every rule whose selector names all of these pieces, joined. */
function rulesNaming(css: string, ...pieces: string[]): string {
    const found: string[] = [];

    for (const [, selector = '', body = ''] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (pieces.every((piece) => selector.includes(piece))) {
            found.push(body);
        }
    }

    return found.join('\n');
}

/** The layer, as the sheet names it, and the origin Radix works out for it. */
const LAYERS = [
    ['menu-content', 'var(--radix-dropdown-menu-content-transform-origin)'],
    ['context-menu-content', 'var(--radix-context-menu-content-transform-origin)'],
    ['popover-panel', 'var(--radix-popover-content-transform-origin)'],
    ['hover-card-panel', 'var(--radix-hover-card-content-transform-origin)'],
    ['select-content', 'var(--radix-select-content-transform-origin)'],
    ['tooltip', 'var(--radix-tooltip-content-transform-origin)'],
] as const;

const ENTER = 'mandor-layer-in var(--mandor-duration-base) var(--mandor-ease-out)';
const LEAVE = 'mandor-layer-out var(--mandor-duration-fast) var(--mandor-ease-in)';

/**
 * Menus, popovers, hover cards, selects, tooltips and the palette fade in and grow a little from
 * where they hang, and fade out quicker than they came. The growth is the motion scale, which a
 * system asking for less motion sets to nothing: the fade stays.
 */
describe('how the layers that float over the window come and go', () => {
    it('fades a layer in from a step smaller and out to the same', async () => {
        const runtime = await cssOf('runtime.css');

        for (const name of ['mandor-layer-in', 'mandor-layer-out']) {
            const at = runtime.indexOf(`@keyframes ${name} {`);
            const frames = runtime.slice(at, runtime.indexOf('}\n}', at));

            expect(at, name).toBeGreaterThan(-1);
            expect(frames, name).toContain('opacity: 0;');
            expect(frames, name).toContain('transform: scale(var(--mandor-motion-scale));');
        }
    });

    it('grows each layer from the side it hangs from, at the pace of the scale', async () => {
        const runtime = await cssOf('runtime.css');

        for (const [part, origin] of LAYERS) {
            const named = `[data-part='${part}']`;

            expect(rulesNaming(runtime, named), part).toContain(`transform-origin: ${origin}`);
            expect(rulesNaming(runtime, named, "[data-state='closed']"), part).toContain(LEAVE);
        }

        for (const [part] of LAYERS.filter(([part]) => part !== 'tooltip')) {
            expect(
                rulesNaming(runtime, `[data-part='${part}']`, "[data-state='open']"),
                part,
            ).toContain(ENTER);
        }
    });

    /**
     * A tooltip that opens after the pointer rested fades in; one that opens at once, because
     * the pointer moved over from another, shows at once, the way a row of tooltips is read.
     */
    it('fades a tooltip in only when it opens after the pointer rested', async () => {
        const runtime = await cssOf('runtime.css');

        expect(
            rulesNaming(runtime, "[data-part='tooltip']", "[data-state='delayed-open']"),
        ).toContain(ENTER);
        expect(runtime).not.toContain("[data-state='instant-open']");
    });

    it('grows the palette from its top edge, where it hangs', async () => {
        const runtime = await cssOf('runtime.css');
        const palette = "[data-part='command-palette']";

        expect(rulesNaming(runtime, palette)).toContain('transform-origin: 50% 0');
        expect(rulesNaming(runtime, palette, "[data-state='open']")).toContain(ENTER);
        expect(rulesNaming(runtime, palette, "[data-state='closed']")).toContain(LEAVE);
    });

    it('greys the suggestion the keyboard or the pointer is on, like a taken line', async () => {
        const runtime = await cssOf('runtime.css');

        expect(rulesNaming(runtime, "[data-part='suggest-option'][data-active='true']")).toContain(
            'background: var(--surface-selected)',
        );
    });
});
