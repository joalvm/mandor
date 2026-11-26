import {
    acceptsPreferenceValue,
    PREFERENCE_DEFINITIONS,
    type PreferenceValues,
} from '@mandor/schema';

export const PREFERENCE_STORAGE_KEY = 'mandor.preferences';

export function readAppPreferences(): PreferenceValues {
    const stored = window.localStorage.getItem(PREFERENCE_STORAGE_KEY);

    if (stored === null) {
        return {};
    }

    return parsedPreferences(stored);
}

export function writeAppPreferences(values: PreferenceValues): void {
    window.localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(values));
}

function parsedPreferences(stored: string): PreferenceValues {
    try {
        const parsed: unknown = JSON.parse(stored);

        return preferenceValuesOf(parsed);
    } catch {
        return {};
    }
}

/** What `appearance.theme` held, as the mode and the manual theme that took its place. */
const LEGACY_THEMES = new Map<string, PreferenceValues>([
    ['dark', { 'appearance.themeManual': 'dark', 'appearance.themeMode': 'manual' }],
    ['light', { 'appearance.themeManual': 'light', 'appearance.themeMode': 'manual' }],
    ['system', { 'appearance.themeMode': 'system' }],
]);

function preferenceValuesOf(value: unknown): PreferenceValues {
    if (!isRecord(value)) {
        return {};
    }

    const values: PreferenceValues = {};

    for (const definition of PREFERENCE_DEFINITIONS) {
        const stored = value[definition.key];

        if (acceptsPreferenceValue(definition, stored)) {
            values[definition.key] = stored;
        }
    }

    return withLegacyTheme(values, value['appearance.theme']);
}

/** A theme chosen before the themes had a mode carries over, unless a mode was chosen since. */
function withLegacyTheme(values: PreferenceValues, legacy: unknown): PreferenceValues {
    const migrated = typeof legacy === 'string' ? LEGACY_THEMES.get(legacy) : undefined;

    if (values['appearance.themeMode'] !== undefined || migrated === undefined) {
        return values;
    }

    return { ...values, ...migrated };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
