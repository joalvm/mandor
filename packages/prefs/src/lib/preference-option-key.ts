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
 * The words one option of a preference reads as: an amount of the unit the preference names,
 * `30 days`, or the name of its own message.
 */
export function preferenceOptionLabel(
    definition: { key: string; unitKey?: string | undefined },
    option: string,
    translate: Translate,
): string {
    return definition.unitKey === undefined
        ? translate(preferenceOptionKey(definition, option))
        : translate(definition.unitKey, { count: Number(option) });
}
