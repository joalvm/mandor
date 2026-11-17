import type { PreferenceDefinition } from './preference-definition.js';
import { PREFERENCE_DEFINITIONS } from './preference-definitions.js';
import type { PreferenceScope } from './preference-scope.js';

const SCOPE_PRECEDENCE = ['app', 'repo', 'workspace'] as const;

export type PreferenceKey = (typeof PREFERENCE_DEFINITIONS)[number]['key'];

export type PreferenceValues = Partial<Record<PreferenceKey, unknown>>;

export type PreferenceLayers = Partial<Record<PreferenceScope, PreferenceValues>>;

export type ResolvedPreferenceValues = Record<PreferenceKey, string>;

type DefinedPreference = PreferenceDefinition & { key: PreferenceKey };

export function resolvePreferenceValues(layers: PreferenceLayers): ResolvedPreferenceValues {
    const values: Record<string, string> = {};

    for (const definition of PREFERENCE_DEFINITIONS) {
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
    if (typeof stored !== 'string') {
        return definition.defaultValue;
    }

    if (!definition.values.includes(stored)) {
        return definition.defaultValue;
    }

    return stored;
}
