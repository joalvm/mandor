import type { AppearanceSource } from '@mandor/ipc';
import { THEME_IDS, type ResolvedPreferenceValues, type ThemeId } from '@mandor/schema';

export const THEME_MODES = ['system', 'manual'] as const;

/** Follow the system with a theme for each of its two appearances, or hold one theme. */
export type ThemeMode = (typeof THEME_MODES)[number];

/** The three themes a reader sets, and whether the system or the reader picks among them. */
export type ThemeChoice = {
    day: ThemeId;
    manual: ThemeId;
    mode: ThemeMode;
    night: ThemeId;
};

/** The two colour schemes a theme belongs to, which is all the system knows how to be. */
export type ThemeFamily = 'dark' | 'light';

const FAMILIES: Record<ThemeId, ThemeFamily> = {
    dark: 'dark',
    'dark-contrast': 'dark',
    light: 'light',
    'light-contrast': 'light',
};

const PICKS: Record<ThemeMode, (choice: ThemeChoice, systemIsDark: boolean) => ThemeId> = {
    manual: (choice) => choice.manual,
    system: (choice, systemIsDark) => (systemIsDark ? choice.night : choice.day),
};

const SOURCES: Record<ThemeMode, (choice: ThemeChoice) => AppearanceSource> = {
    manual: (choice) => FAMILIES[choice.manual],
    system: () => 'system',
};

/** The colour scheme a theme is drawn in: what the system is told to be while the theme is up. */
export function themeFamily(id: ThemeId): ThemeFamily {
    return FAMILIES[id];
}

/**
 * What the window asks the system to be. Only a held theme fixes it: while the system picks the
 * theme it has to stay the system, or the scheme the window reads from it would be a lie.
 */
export function appearanceSourceOf(choice: ThemeChoice): AppearanceSource {
    return SOURCES[choice.mode](choice);
}

/** The theme the window is drawn in: the held one, or the one for the appearance of the system. */
export function resolveTheme(choice: ThemeChoice, systemIsDark: boolean): ThemeId {
    return PICKS[choice.mode](choice, systemIsDark);
}

function themeIdOf(value: string, fallback: ThemeId): ThemeId {
    return THEME_IDS.find((id) => id === value) ?? fallback;
}

/** The choice the preferences hold; a value outside the catalogue reads as the default. */
export function themeChoiceOf(values: ResolvedPreferenceValues): ThemeChoice {
    return {
        day: themeIdOf(values['appearance.themeDay'], 'light'),
        manual: themeIdOf(values['appearance.themeManual'], 'light'),
        mode: THEME_MODES.find((mode) => mode === values['appearance.themeMode']) ?? 'system',
        night: themeIdOf(values['appearance.themeNight'], 'dark'),
    };
}
