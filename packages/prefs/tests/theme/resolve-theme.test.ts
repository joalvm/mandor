import { resolvePreferenceValues, THEME_IDS } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import {
    appearanceSourceOf,
    resolveTheme,
    themeChoiceOf,
    themeFamily,
    type ThemeChoice,
} from '../../src/theme/resolve-theme.js';

const CHOICE: ThemeChoice = {
    day: 'light-contrast',
    manual: 'dark',
    mode: 'system',
    night: 'dark-contrast',
};

describe('the theme the window is drawn in', () => {
    it('follows the appearance of the system, with the theme chosen for each', () => {
        expect(resolveTheme(CHOICE, false)).toBe('light-contrast');
        expect(resolveTheme(CHOICE, true)).toBe('dark-contrast');
    });

    it('holds the manual theme whatever the system looks like', () => {
        const manual: ThemeChoice = { ...CHOICE, mode: 'manual' };

        expect(resolveTheme(manual, false)).toBe('dark');
        expect(resolveTheme(manual, true)).toBe('dark');
    });

    it('puts every theme of the catalogue in one of the two colour schemes', () => {
        expect(THEME_IDS.map((id) => themeFamily(id))).toEqual(['light', 'light', 'dark', 'dark']);
    });
});

describe('what the window asks the system to be', () => {
    it('stays the system while the system picks the theme, whichever themes were chosen', () => {
        expect(appearanceSourceOf(CHOICE)).toBe('system');
        expect(appearanceSourceOf({ ...CHOICE, day: 'dark', night: 'light' })).toBe('system');
    });

    it('is the colour scheme of the theme that is held', () => {
        expect(appearanceSourceOf({ ...CHOICE, manual: 'dark-contrast', mode: 'manual' })).toBe(
            'dark',
        );
        expect(appearanceSourceOf({ ...CHOICE, manual: 'light-contrast', mode: 'manual' })).toBe(
            'light',
        );
    });
});

describe('the choice read out of the preferences', () => {
    it('is the defaults while nothing was chosen: follow the system, light by day, dark by night', () => {
        expect(themeChoiceOf(resolvePreferenceValues({}))).toEqual({
            day: 'light',
            manual: 'light',
            mode: 'system',
            night: 'dark',
        });
    });

    it('carries what was chosen', () => {
        const values = resolvePreferenceValues({
            app: {
                'appearance.themeDay': 'light-contrast',
                'appearance.themeManual': 'dark-contrast',
                'appearance.themeMode': 'manual',
                'appearance.themeNight': 'dark',
            },
        });

        expect(themeChoiceOf(values)).toEqual({
            day: 'light-contrast',
            manual: 'dark-contrast',
            mode: 'manual',
            night: 'dark',
        });
    });
});
