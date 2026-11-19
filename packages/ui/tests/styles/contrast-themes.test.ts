import { describe, expect, it } from 'vitest';

import { contrastOf, renderedColor } from './contrast-math.js';
import { themeOf, type ThemeMode } from './theme-values.js';

const SURFACES = [
    'app',
    'panel',
    'frame',
    'card',
    'sunken',
    'raised',
    'dialog',
    'control',
    'control-hover',
    'control-active',
    'selected',
    'dialog-nav',
    'dialog-nav-active',
] as const;
const BASE_SURFACES = ['app', 'panel', 'frame', 'card', 'sunken', 'raised', 'dialog'] as const;
const LINES = ['subtle', 'chrome', 'strong', 'hover', 'control', 'control-hover', 'error'] as const;
const CONTRAST_MODES = ['light-contrast', 'dark-contrast'] as const;
/** The scheme each high-contrast theme is laid over. */
const BASES = { 'dark-contrast': 'dark', 'light-contrast': 'light' } as const satisfies Record<
    (typeof CONTRAST_MODES)[number],
    ThemeMode
>;

/**
 * The high-contrast themes are their scheme with a few tokens raised: the reader who asks for
 * them gets text at 7:1 and every line that draws a box at 4.5:1, and the rest is the theme they
 * already know. Each app paints its own accent, and neither moves the raised tokens.
 */
describe.each(['teal', 'orange'] as const)('the high-contrast themes, %s accent', (accent) => {
    it.each(CONTRAST_MODES)('keeps all the text at 7:1 in %s', async (mode) => {
        const theme = await themeOf(mode, accent);

        for (const text of ['primary', 'secondary'] as const) {
            for (const surface of SURFACES) {
                const ratio = contrastOf(
                    renderedColor(theme, `text-${text}`),
                    renderedColor(theme, `surface-${surface}`),
                );

                expect(ratio, `${text} on ${surface}`).toBeGreaterThanOrEqual(7);
            }
        }
    });

    it.each(CONTRAST_MODES)('keeps every line at 4.5:1 on the surfaces in %s', async (mode) => {
        const theme = await themeOf(mode, accent);

        for (const line of LINES) {
            for (const surface of BASE_SURFACES) {
                const ratio = contrastOf(
                    renderedColor(theme, `border-${line}`),
                    renderedColor(theme, `surface-${surface}`),
                );

                expect(ratio, `${line} on ${surface}`).toBeGreaterThanOrEqual(4.5);
            }
        }
    });

    it.each(CONTRAST_MODES)('draws the focus ring wider than its scheme in %s', async (mode) => {
        const theme = await themeOf(mode, accent);
        const scheme = await themeOf(BASES[mode], accent);

        expect(Number.parseInt(theme['focus-ring-width'] ?? '', 10)).toBeGreaterThan(
            Number.parseInt(scheme['focus-ring-width'] ?? '', 10),
        );
    });

    /** What is not raised is the scheme itself: a token of the two themes that drifts apart is a bug. */
    it.each(CONTRAST_MODES)('raises only text, lines and the ring in %s', async (mode) => {
        const theme = await themeOf(mode, accent);
        const scheme = await themeOf(BASES[mode], accent);
        const raised = Object.keys(theme).filter((name) => theme[name] !== scheme[name]);

        expect(
            raised.filter((name) => !/^(?:text-secondary|border-.+|focus-ring.*)$/.test(name)),
        ).toEqual([]);
        expect(raised).toContain('text-secondary');
    });
});
