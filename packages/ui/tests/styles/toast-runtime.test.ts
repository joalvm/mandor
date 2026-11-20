import { describe, expect, it } from 'vitest';

import { cssOf } from './theme-values.js';

/** The declarations of the last rule whose selector list ends with exactly this selector. */
function ruleFor(css: string, selector: string): string {
    const at = css.lastIndexOf(`${selector} {`);

    return at === -1 ? '' : (/{([^}]*)}/.exec(css.slice(at))?.[1] ?? '');
}

const VIEWPORT = "[data-part='toast-viewport']";
const TOAST = `${VIEWPORT} > [data-part='toast']`;

/**
 * Notices stack in their corner: the newest in front, the two before it peeking out above, a
 * step smaller each. With the pointer or the focus on the stack it opens into a list, each one
 * lifted by what the hook of the stack measured; what does not fit is counted above it.
 */
describe('the stack of notices', () => {
    it('lays every notice on the corner, the older ones peeking out above the front', async () => {
        const runtime = await cssOf('runtime.css');

        expect(ruleFor(runtime, TOAST)).toContain('position: absolute');
        expect(ruleFor(runtime, `${TOAST}:nth-last-child(2)`)).toContain(
            'transform: translateY(-10px) scale(0.95)',
        );
        expect(ruleFor(runtime, `${TOAST}:nth-last-child(3)`)).toContain(
            'transform: translateY(-20px) scale(0.9)',
        );
        expect(ruleFor(runtime, `${TOAST}:not(:last-child)`)).toContain(
            'block-size: var(--toast-front-height)',
        );
    });

    it('opens into a list under the pointer and with the focus inside', async () => {
        const runtime = await cssOf('runtime.css');

        for (const state of [':hover', ':focus-within']) {
            expect(runtime, state).toContain(`${VIEWPORT}${state} > [data-part='toast']`);
        }

        expect(ruleFor(runtime, `${VIEWPORT}:focus-within > [data-part='toast']`)).toContain(
            'transform: translateY(calc(-1 * var(--toast-offset)))',
        );
        expect(ruleFor(runtime, `${VIEWPORT}:focus-within`)).toContain(
            'block-size: var(--toast-stack-height)',
        );
    });

    it('moves by the travel of the scale, which a system asking for less motion stills', async () => {
        const runtime = await cssOf('runtime.css');
        const scales = await cssOf('scales.css');
        const reduced = scales.slice(scales.indexOf('@media (prefers-reduced-motion: reduce)'));

        expect(ruleFor(runtime, TOAST)).toContain(
            'transform var(--mandor-duration-travel) var(--mandor-ease-out)',
        );
        expect(ruleFor(runtime, TOAST)).toContain(
            'opacity var(--mandor-duration-base) var(--mandor-ease-out)',
        );
        expect(scales).toContain('--mandor-duration-travel: 200ms;');
        expect(reduced).toMatch(/--mandor-duration-travel:\s*0ms;/);
    });

    it('counts what does not fit above the stack, open or not', async () => {
        const runtime = await cssOf('runtime.css');

        expect(ruleFor(runtime, `${VIEWPORT} > [data-part='toast-overflow']`)).toContain(
            'inset-block-end: calc(100% + var(--mandor-gap-control))',
        );
    });
});
