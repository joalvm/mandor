import type { PreferenceScope } from './preference-scope.js';

/** What every preference says of itself: where it is kept, where it is shown and how it reads. */
type PreferenceBase = {
    defaultValue: string;
    helpKey: string;
    key: string;
    labelKey: string;
    scope: PreferenceScope;
    section: string;
};

/**
 * A preference taken from a list: a select, or a switch when the list is on and off. A list of
 * amounts names its unit, and each option reads as that many of it instead of by a name of its own.
 */
export type ChoicePreference = PreferenceBase & {
    /**
     * The options that read the same in every language, by their own names: a language is listed
     * in itself, so whoever cannot read the window now still finds theirs.
     */
    optionNames?: Readonly<Record<string, string>> | undefined;
    type: 'select' | 'switch';
    /** The message that reads an option as an amount, `{{count}}` of the unit. */
    unitKey?: string | undefined;
    values: readonly string[];
};

/** A preference written by hand, up to a length; empty is a value like any other. */
export type TextPreference = PreferenceBase & {
    maxLength: number;
    type: 'text';
};

export type PreferenceDefinition = ChoicePreference | TextPreference;

/** The two values of a switch, in the order a reader says them. */
export const SWITCH_VALUES = ['on', 'off'] as const;

/** Whether a stored value is one the preference takes; any other falls back to its default. */
export function acceptsPreferenceValue(
    definition: PreferenceDefinition,
    value: unknown,
): value is string {
    if (typeof value !== 'string') {
        return false;
    }

    return 'values' in definition
        ? definition.values.includes(value)
        : value.length <= definition.maxLength;
}
