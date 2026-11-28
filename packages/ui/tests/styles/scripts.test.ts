import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { cssOf, declarationsOf } from './theme-values.js';

/** Scripts that set their glyphs at their own spacing: the Latin tightening does not reach them. */
const UNTRACKED = ['zh', 'ja', 'ko', 'hi', 'mr', 'ne', 'bn', 'th', 'ar', 'fa', 'ur'] as const;

/** The rule those scripts share: it opens with Chinese. */
const UNTRACKED_RULE = /^:root:is\(\s*:lang\(zh\),/m;

/** The grid lives in the shell, and its tab labels carry a step's tracking of their own. */
const GRID = join(process.cwd(), 'packages', 'shell', 'src', 'styles', 'grid.css');

/** The first rule whose selector matches: what it selects and what it declares. */
function ruleOf(css: string, selector: RegExp): { body: string; selector: string } {
    const start = css.search(selector);
    const open = css.indexOf('{', start);

    if (start < 0) {
        return { body: '', selector: '' };
    }

    return { body: css.slice(open + 1, css.indexOf('}', open)), selector: css.slice(start, open) };
}

function stacksOf(css: string): string[] {
    return [...css.matchAll(/--mandor-font-script:\s*([^;]+);/g)].map(([, stack = '']) => stack);
}

describe('the type of each script', () => {
    it('keeps the tracking of every step in a Latin window', async () => {
        expect(declarationsOf(ruleOf(await cssOf('scripts.css'), /^:root\s*{/m).body)).toEqual({
            'mandor-tracking': '1',
        });
    });

    it('drops the tracking in the scripts that space their own glyphs', async () => {
        const { body, selector } = ruleOf(await cssOf('scripts.css'), UNTRACKED_RULE);

        expect(declarationsOf(body)).toMatchObject({
            'mandor-tracking': '0',
            'tracking-wide': '0em',
        });
        expect([...selector.matchAll(/:lang\(([\w-]+)\)/g)].map(([, code]) => code)).toEqual(
            UNTRACKED,
        );
    });

    it('writes Latin letters and digits with Inter and fills the rest from the script', async () => {
        const css = await cssOf('scripts.css');
        const ui = declarationsOf(ruleOf(css, UNTRACKED_RULE).body)['mandor-font-ui'];

        expect(ui?.split(',').map((font) => font.trim())).toEqual([
            "'Inter Variable'",
            'var(--mandor-font-script)',
            'ui-sans-serif',
            'system-ui',
            'sans-serif',
        ]);
        expect(stacksOf(css).length).toBeGreaterThanOrEqual(8);
        expect(stacksOf(css).filter((stack) => stack.includes('Inter'))).toEqual([]);
    });

    it('turns what a stylesheet draws towards a side round in a window written from the right', async () => {
        const css = await cssOf('scripts.css');

        expect(declarationsOf(ruleOf(css, /^:root\s*{\s*--mandor-inline-sign/m).body)).toEqual({
            'mandor-inline-sign': '1',
            'mandor-side-start': 'left',
            'mandor-to-inline-end': 'to right',
        });
        expect(declarationsOf(ruleOf(css, /^:root\[dir='rtl'\]\s*{/m).body)).toEqual({
            'mandor-inline-sign': '-1',
            'mandor-side-start': 'right',
            'mandor-to-inline-end': 'to left',
        });
    });

    it('draws a glyph that points along the line the other way round from the right', async () => {
        const css = await cssOf('scripts.css');
        const { body } = ruleOf(css, /^:root\[dir='rtl'\] \[data-part='icon'\]\[data-mirrored\]/m);

        expect(body.trim()).toBe('scale: -1 1;');
    });

    it('multiplies the tracking of every step, the grid tab too, by the script', async () => {
        const index = await cssOf('index.css');
        const grid = await readFile(GRID, 'utf8');
        const spacings = [
            ...index.matchAll(/--text-[\w-]+--letter-spacing:\s*([^;]+);/g),
            ...grid.matchAll(/letter-spacing:\s*([^;]+);/g),
        ].map(([, value = '']) => value);

        expect(spacings).toHaveLength(9);
        expect(spacings.filter((value) => !value.endsWith('* var(--mandor-tracking))'))).toEqual(
            [],
        );
        expect(index).toContain("@import './scripts.css' layer(theme);");
    });
});
