import { describe, expect, it } from 'vitest';

import { cssOf, declarationsOf } from './theme-values.js';

/** What a window that moves less sets: no travel and no growth, the fades kept at their pace. */
const REDUCED = {
    'mandor-duration-travel': '0ms',
    'mandor-motion-scale': '1',
    'mandor-motion-scale-overlay': '1',
    'mandor-motion-shift': '0px',
} as const;

/** The body of the first rule written for exactly this selector, after `from`. */
function blockOf(css: string, selector: string, from = 0): string {
    const at = css.indexOf(`${selector} {`, from);

    return at === -1 ? '' : css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
}

/**
 * The reader chooses how the window moves: as the system asks, always fully, or always less.
 * `PreferencesApplication` names the choice on the root, and the scales read it.
 */
describe('the motion the reader chooses', () => {
    it('moves less when the reader asks for it, whatever the system says', async () => {
        const scales = await cssOf('scales.css');

        expect(declarationsOf(blockOf(scales, ":root[data-motion='reduced']"))).toEqual(REDUCED);
    });

    it('follows a system that asks for less unless the reader holds full motion', async () => {
        const scales = await cssOf('scales.css');
        const media = scales.indexOf('@media (prefers-reduced-motion: reduce)');

        expect(media).toBeGreaterThan(-1);
        expect(declarationsOf(blockOf(scales, ":root:not([data-motion='full'])", media))).toEqual(
            REDUCED,
        );
    });

    /**
     * The pulses of the utilities (`motion-safe:`, `motion-reduce:`) read the same choice: a
     * reader who holds less motion stops them, one who holds full motion keeps them.
     */
    it('lets the motion utilities read the choice as well as the system', async () => {
        const index = await cssOf('index.css');

        for (const name of ['motion-safe', 'motion-reduce']) {
            expect(index, name).toContain(`@custom-variant ${name} {`);
        }

        const reduce = index.slice(index.indexOf('@custom-variant motion-reduce {'));
        const safe = index.slice(index.indexOf('@custom-variant motion-safe {'));

        expect(reduce).toMatch(
            /^@custom-variant motion-reduce \{\s*@media \(prefers-reduced-motion: reduce\)/,
        );
        expect(reduce).toContain(
            "&:where(:root[data-motion='reduced'], :root[data-motion='reduced'] *)",
        );
        expect(safe).toMatch(
            /^@custom-variant motion-safe \{\s*@media \(prefers-reduced-motion: no-preference\)/,
        );
        expect(safe).toContain("&:where(:root[data-motion='full'], :root[data-motion='full'] *)");
    });
});
