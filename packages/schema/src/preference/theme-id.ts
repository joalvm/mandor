/** The themes the window can be drawn in: each colour scheme, and its high-contrast variant. */
export const THEME_IDS = ['light', 'light-contrast', 'dark', 'dark-contrast'] as const;

export type ThemeId = (typeof THEME_IDS)[number];
