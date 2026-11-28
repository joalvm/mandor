/** Key of the message that names one option of a preference, in the preferences bundle. */
export function preferenceOptionKey(
    definition: {
        key: string;
    },
    option: string,
): string {
    return `preferences:${definition.key.replace('.', '-')}-${option}`;
}

/** What says a message of the window from its key, with the values its placeholders take. */
type Translate = (key: string, values?: Record<string, number | string>) => string;

/**
 * The words one option of a preference reads as: its own name when it has one, the same in every
 * language (`Español`), an amount of the unit the preference names (`30 days`), or else the name
 * of its own message.
 */
export function preferenceOptionLabel(
    definition: {
        key: string;
        optionNames?: Readonly<Record<string, string>> | undefined;
        unitKey?: string | undefined;
    },
    option: string,
    translate: Translate,
): string {
    const ownName = definition.optionNames?.[option];

    if (ownName !== undefined) {
        return ownName;
    }

    return definition.unitKey === undefined
        ? translate(preferenceOptionKey(definition, option))
        : translate(definition.unitKey, { count: Number(option) });
}
