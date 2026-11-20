import { describe, expect, it } from 'vitest';

import { cssOf } from './theme-values.js';

/** The body of the block that opens right after `from`, braces balanced. */
function blockAfter(css: string, from: number): string {
    const open = css.indexOf('{', from);
    let depth = 0;

    for (let index = open; index < css.length; index += 1) {
        depth += css[index] === '{' ? 1 : 0;
        depth -= css[index] === '}' ? 1 : 0;

        if (depth === 0) {
            return css.slice(open + 1, index);
        }
    }

    return '';
}

/** Every keyframe set of the dialog, by name, with what it declares. */
function dialogKeyframes(css: string): Map<string, string> {
    const sets = [...css.matchAll(/@keyframes (mandor-dialog-[\w-]+)/g)];

    return new Map(sets.map((match) => [match[1] ?? '', blockAfter(css, match.index)]));
}

/** The declarations of the rule written for exactly this selector. */
function ruleFor(css: string, selector: string): string {
    const at = css.indexOf(`${selector} {`);

    return at === -1 ? '' : blockAfter(css, at);
}

describe('how a dialog moves and where its parts sit', () => {
    it('enters and leaves by opacity and transform alone', async () => {
        const keyframes = dialogKeyframes(await cssOf('runtime.css'));

        expect(keyframes.size).toBeGreaterThanOrEqual(4);

        for (const [name, body] of keyframes) {
            const properties = [...body.matchAll(/([\w-]+)\s*:/g)].map((match) => match[1]);

            expect(
                properties.filter((property) => property !== 'opacity' && property !== 'transform'),
                name,
            ).toEqual([]);
        }
    });

    /**
     * The durations are the tokens of the scale, and so is the way the surface travels: a dialog
     * timed or moved by a number of its own would keep moving for whoever asked the system for
     * less motion.
     */
    it('times the scrim and the surface from the motion scale, both ways', async () => {
        const runtime = await cssOf('runtime.css');

        for (const part of ['dialog', 'dialog-scrim']) {
            for (const state of ['open', 'closed']) {
                const rule = ruleFor(runtime, `[data-part='${part}'][data-state='${state}']`);

                expect(rule, `${part} ${state}`).toMatch(
                    /animation:\s*mandor-dialog-[\w-]+ var\(--mandor-duration-\w+\) var\(--mandor-ease-\w+\)/,
                );
            }
        }
    });

    /**
     * Asking for less motion takes the travel away, never the fade: the surface stops rising and
     * growing, and still dissolves in and out at the pace of the scale. A window where every
     * layer snaps in and out reads as rigid, and a fade moves nothing across the eye.
     */
    it('keeps the fades and drops only the travel when the system asks for less motion', async () => {
        const scales = await cssOf('scales.css');
        const reduced = blockAfter(
            scales,
            scales.indexOf('@media (prefers-reduced-motion: reduce)'),
        );
        const runtime = await cssOf('runtime.css');

        expect(reduced).not.toMatch(/--mandor-duration-/);
        expect(reduced).toMatch(/--mandor-motion-shift:\s*0px/);
        expect(reduced).toMatch(/--mandor-motion-scale:\s*1;/);
        expect(reduced).toMatch(/--mandor-motion-scale-overlay:\s*1;/);

        for (const name of ['mandor-dialog-in', 'mandor-dialog-out']) {
            expect(blockAfter(runtime, runtime.indexOf(`@keyframes ${name}`)), name).toMatch(
                /transform:[^;]*var\(--mandor-motion-scale-overlay\)/,
            );
        }
    });

    /**
     * A dialog floats over the window, so it grows from its centre and does not slide in from
     * anywhere; it leaves a step faster than it came, and both paces are tokens of the scale.
     */
    it('grows from its centre and lets go faster than it came', async () => {
        const runtime = await cssOf('runtime.css');
        const scales = await cssOf('scales.css');

        for (const name of ['mandor-dialog-in', 'mandor-dialog-out']) {
            const body = blockAfter(runtime, runtime.indexOf(`@keyframes ${name}`));

            expect(body, name).not.toMatch(/translate/);
            expect(body, name).toMatch(
                /transform:\s*scale\(var\(--mandor-motion-scale-overlay\)\)/,
            );
        }

        expect(scales).toContain('--mandor-motion-scale-overlay: 0.96;');
        expect(scales).toContain('--mandor-duration-exit: 150ms;');
        expect(ruleFor(runtime, "[data-part='dialog'][data-state='open']")).toContain(
            'var(--mandor-duration-slow) var(--mandor-ease-out)',
        );

        for (const part of ['dialog', 'dialog-scrim']) {
            expect(ruleFor(runtime, `[data-part='${part}'][data-state='closed']`), part).toContain(
                'var(--mandor-duration-exit) var(--mandor-ease-in)',
            );
        }
    });

    /**
     * A dialog is read up close and worked with the pointer: its controls stand a step taller
     * than the ones of the window, so every control drawn inside it takes the height of the step.
     */
    it('gives the controls of a dialog the taller step of the scale', async () => {
        const runtime = await cssOf('runtime.css');

        expect(await cssOf('scales.css')).toContain('--mandor-height-control-dialog: 32px;');
        expect(ruleFor(runtime, "[data-part='dialog']")).toContain(
            '--mandor-height-control: var(--mandor-height-control-dialog);',
        );
    });

    /**
     * The size is read from what the dialog holds, so no caller picks one: a confirmation asks
     * one thing, a form is a column, and a column of sections beside a detail needs room and a
     * height it keeps while the sections change under it.
     */
    it('sizes a dialog by what it holds, from the scale', async () => {
        const runtime = await cssOf('runtime.css');
        const sections = ruleFor(runtime, "[data-part='dialog']:has(> [data-part='dialog-nav'])");

        expect(ruleFor(runtime, "[data-part='dialog']")).toMatch(
            /width:\s*var\(--mandor-width-dialog-form\);/,
        );
        expect(ruleFor(runtime, "[data-part='dialog'][role='alertdialog']")).toMatch(
            /width:\s*var\(--mandor-width-dialog-confirm\);/,
        );
        expect(sections).toMatch(/width:\s*var\(--mandor-width-dialog-sections\);/);
        expect(sections).toMatch(/height:\s*var\(--mandor-height-dialog-sections\);/);

        const code = ruleFor(runtime, "[data-part='dialog']:has([data-part='code-editor'])");

        expect(code).toMatch(/width:\s*var\(--mandor-width-dialog-code\);/);
        expect(code).toMatch(/height:\s*var\(--mandor-height-dialog-code\);/);
    });

    /**
     * The title, the way out and the first section stand on one line, and that line is the
     * middle of a band. Each offset is worked out from the heights of the scale, so changing a
     * height moves all three together instead of leaving one of them a few pixels off.
     */
    it('derives where the title, the way out and the first section stand', async () => {
        const runtime = await cssOf('runtime.css');
        const middle = (height: string): string =>
            `calc((var(--mandor-height-header) - var(--mandor-${height})) / 2)`;

        expect(ruleFor(runtime, "[data-part='dialog-header']")).toContain(middle('text-lg-line'));
        expect(ruleFor(runtime, "[data-part='dialog-close']")).toContain(middle('height-control'));
        expect(ruleFor(runtime, "[data-part='dialog-nav']")).toContain(middle('height-row'));
    });

    it('names the areas of a dialog once, and seats every part in its own', async () => {
        const runtime = await cssOf('runtime.css');

        expect(ruleFor(runtime, "[data-part='dialog']")).toMatch(
            /grid-template-areas:\s*'nav header'\s*'nav body'\s*'nav footer'/,
        );

        for (const area of ['nav', 'header', 'body', 'footer']) {
            expect(ruleFor(runtime, `[data-part='dialog-${area}']`), area).toMatch(
                new RegExp(`grid-area:\\s*${area};`),
            );
        }
    });
});
