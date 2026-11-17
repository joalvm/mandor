/** Key of the message that names one option of a preference, in the preferences bundle. */
export function preferenceOptionKey(
    definition: {
        key: string;
    },
    option: string,
): string {
    return `preferences:${definition.key.replace('.', '-')}-${option}`;
}
