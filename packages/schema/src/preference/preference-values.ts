import { acceptsPreferenceValue, type PreferenceDefinition } from './preference-definition.js';
import { PREFERENCE_DEFINITIONS } from './preference-definitions.js';
import type { PreferenceScope } from './preference-scope.js';

const SCOPE_PRECEDENCE = ['app', 'repo', 'workspace'] as const;

export type PreferenceKey = (typeof PREFERENCE_DEFINITIONS)[number]['key'];

export type PreferenceValues = Partial<Record<PreferenceKey, unknown>>;

export type PreferenceLayers = Partial<Record<PreferenceScope, PreferenceValues>>;

export type ResolvedPreferenceValues = Record<PreferenceKey, string>;

type DefinedPreference = PreferenceDefinition & { key: PreferenceKey };

/** What every preference is worth once the layers are read, from the definitions given. */
export function resolvePreferenceValues(
    layers: PreferenceLayers,
    definitions: readonly DefinedPreference[] = PREFERENCE_DEFINITIONS,
): ResolvedPreferenceValues {
    const values: Record<string, string> = {};

    for (const definition of definitions) {
        values[definition.key] = resolveDefinition(definition, layers);
    }

    return values as ResolvedPreferenceValues;
}

function resolveDefinition(definition: DefinedPreference, layers: PreferenceLayers): string {
    let value = definition.defaultValue;

    for (const scope of SCOPE_PRECEDENCE) {
        const stored: unknown = layers[scope]?.[definition.key];

        if (stored === undefined) {
            continue;
        }

        value = validValueOrDefault(definition, stored);
    }

    return value;
}

function validValueOrDefault(definition: DefinedPreference, stored: unknown): string {
    return acceptsPreferenceValue(definition, stored) ? stored : definition.defaultValue;
}
