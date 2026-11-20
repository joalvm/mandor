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
] as const;
const BASE_SURFACES = ['app', 'panel', 'frame', 'card', 'sunken', 'raised', 'dialog'] as const;
const SUPPORTING_TEXTS = ['secondary', 'accent', 'success', 'warning', 'error', 'info'] as const;
const SOLIDS = ['success', 'warning', 'error', 'info'] as const;
/** Every theme the window can wear passes the same floor; the contrast ones raise it further elsewhere. */
const MODES = [
    'light',
    'dark',
    'light-contrast',
    'dark-contrast',
] as const satisfies readonly ThemeMode[];

/** Each app paints its own accent: a ramp passes here, in both modes, or it does not ship. */
describe.each(['teal', 'orange'] as const)('the semantic theme contrast, %s accent', (accent) => {
    it.each(MODES)('keeps text legible in %s mode', async (mode) => {
        const theme = await themeOf(mode, accent);

        for (const surface of SURFACES) {
            const ratio = contrastOf(
                renderedColor(theme, 'text-primary'),
                renderedColor(theme, `surface-${surface}`),
            );

            expect(ratio, `primary on ${surface}`).toBeGreaterThanOrEqual(4.5);
        }

        for (const text of SUPPORTING_TEXTS) {
            for (const surface of BASE_SURFACES) {
                const ratio = contrastOf(
                    renderedColor(theme, `text-${text}`),
                    renderedColor(theme, `surface-${surface}`),
                );

                expect(ratio, `${text} on ${surface}`).toBeGreaterThanOrEqual(4.5);
            }
        }
    });

    it.each(MODES)('keeps focus and errors perceptible in %s mode', async (mode) => {
        const theme = await themeOf(mode, accent);

        for (const surface of SURFACES) {
            const ratio = contrastOf(
                renderedColor(theme, 'focus-ring'),
                renderedColor(theme, `surface-${surface}`),
            );

            expect(ratio, `focus on ${surface}`).toBeGreaterThanOrEqual(3);
        }

        expect(
            contrastOf(
                renderedColor(theme, 'border-error'),
                renderedColor(theme, 'surface-sunken'),
            ),
        ).toBeGreaterThanOrEqual(3);
    });

    /**
     * A box and a switch that is off are drawn with the line of a control and nothing
     * else: below 3:1 against the surface they sit on, the control is not there. The knob of the
     * switch is the surface of the app riding on that line, so it keeps the same ratio.
     */
    it.each(MODES)('keeps the line of a control perceptible in %s mode', async (mode) => {
        const theme = await themeOf(mode, accent);
        const line = renderedColor(theme, 'border-control');

        for (const surface of BASE_SURFACES) {
            const ratio = contrastOf(line, renderedColor(theme, `surface-${surface}`));

            expect(ratio, `control line on ${surface}`).toBeGreaterThanOrEqual(3);
        }

        expect(theme['border-control-hover']).not.toBe(theme['border-control']);
    });

    /**
     * A dialog is one surface: its column of sections shares the ground of the rest, and the
     * section open wears the grey of a selection in the window. That grey has to stand off the
     * dialog, or a section would open without anything changing.
     */
    it.each(MODES)('marks the open section of a dialog apart from it in %s mode', async (mode) => {
        const theme = await themeOf(mode, accent);

        expect(theme['surface-dialog-nav']).toBeUndefined();
        expect(theme['surface-selected']).not.toBe(theme['surface-dialog']);
    });

    /**
     * The window is a frame with cards on it, and what tells a card from the frame is its tone:
     * no line goes around a card. One value for both is content painted on the frame.
     */
    it.each(MODES)('keeps a card a step apart from the frame in %s mode', async (mode) => {
        const theme = await themeOf(mode, accent);

        expect(theme['surface-frame']).toBeDefined();
        expect(theme['surface-card']).toBeDefined();
        expect(theme['surface-card']).not.toBe(theme['surface-frame']);
    });

    /**
     * A secondary button is a fill and no outline: what tells it from the card it stands on is
     * its gray alone, at rest and under the pointer. A menu floats on the gray of a control in the
     * dark scheme, so there the pointer is what lifts it off.
     */
    it.each(MODES)(
        'keeps a filled control a step apart from its ground in %s mode',
        async (mode) => {
            const theme = await themeOf(mode, accent);

            for (const fill of ['surface-control', 'surface-control-hover'] as const) {
                expect(theme[fill], fill).toBeDefined();
                expect(theme[fill], `${fill} on card`).not.toBe(theme['surface-card']);
            }

            expect(theme['surface-control-hover']).not.toBe(theme['surface-raised']);
        },
    );

    /**
     * The pointer lays one veil over whatever a thing shows: a faint tint on bare ground, and the
     * fill of a thing selected or open a step deeper, so the pointer is seen on it too. A veil
     * that is not faint darkens what it lies on; an opaque one hides it.
     */
    it.each(MODES)('lays the pointer as a faint veil over any fill in %s mode', async (mode) => {
        const theme = await themeOf(mode, accent);
        const veil = theme['surface-veil'] ?? '';
        const alpha = Number.parseInt(veil.slice(7, 9), 16) / 255;

        expect(veil).toMatch(/^#[0-9a-f]{8}$/);
        expect(alpha).toBeGreaterThan(0);
        expect(alpha).toBeLessThanOrEqual(0.04);
    });

    /**
     * A menu, a popover and a list of suggestions float on the raised surface and mark the option
     * under the pointer or the keyboard with the fill of a control under the pointer. One value
     * for both is a menu whose highlight cannot be seen.
     */
    it.each(MODES)(
        'keeps the highlighted option of a menu apart from the menu in %s mode',
        async (mode) => {
            const theme = await themeOf(mode, accent);

            expect(theme['surface-raised']).toBeDefined();
            expect(theme['surface-control-hover']).not.toBe(theme['surface-raised']);
        },
    );

    /**
     * The verb of a destructive confirmation is the one red that speaks of intention, and it
     * carries its label in every state the pointer walks it through.
     */
    it.each(MODES)(
        'keeps the verb of a destructive confirmation legible in %s mode',
        async (mode) => {
            const theme = await themeOf(mode, accent);
            const label = renderedColor(theme, 'text-on-solid-danger');

            for (const name of ['danger', 'danger-hover', 'danger-active'] as const) {
                expect(
                    contrastOf(label, renderedColor(theme, `solid-${name}`)),
                    name,
                ).toBeGreaterThanOrEqual(4.5);
            }
        },
    );

    it.each(MODES)('keeps solid labels legible in %s mode', async (mode) => {
        const theme = await themeOf(mode, accent);
        const accentText = renderedColor(theme, 'text-on-solid-accent');

        for (const name of ['accent', 'accent-hover', 'accent-active'] as const) {
            expect(
                contrastOf(accentText, renderedColor(theme, `solid-${name}`)),
                name,
            ).toBeGreaterThanOrEqual(4.5);
        }

        for (const name of SOLIDS) {
            const ratio = contrastOf(
                renderedColor(theme, 'text-on-solid-status'),
                renderedColor(theme, `solid-${name}`),
            );

            expect(ratio, name).toBeGreaterThanOrEqual(4.5);
        }
    });
});
