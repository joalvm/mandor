import type { PreferenceKey, ResolvedPreferenceValues } from '@mandor/schema';

import { usePreferences } from '../preferences-context.js';

/**
 * One setting as the person left it, or its default: what an app reads to follow a setting only
 * it has, such as how much of its past it keeps.
 */
export function usePreferenceValue<Key extends PreferenceKey>(
    key: Key,
): ResolvedPreferenceValues[Key] {
    return usePreferences().values[key];
}
