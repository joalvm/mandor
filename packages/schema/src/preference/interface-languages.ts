/** Which way a language writes its lines: from the left, or from the right. */
export type TextDirection = 'ltr' | 'rtl';

/** A language the interface can be read in, named the way its own readers name it. */
export type InterfaceLanguage = {
    /** The BCP 47 tag of its folder of messages, `pt-BR` for a regional one. */
    code: string;
    direction: TextDirection;
    /** Its name in itself, `Español`, so a reader finds it whatever the window speaks now. */
    name: string;
};

/**
 * The languages the window offers, in the order the picker lists them. Adding one is its folder of
 * messages and its line here: the picker, the preference and the direction of the window read it
 * from this table, and a test holds the table and the folders to each other.
 */
export const INTERFACE_LANGUAGES = [
    { code: 'en', direction: 'ltr', name: 'English' },
    { code: 'es', direction: 'ltr', name: 'Español' },
] as const satisfies readonly InterfaceLanguage[];

/** Which way the window writes in a language; a tag the table does not hold writes from the left. */
export function textDirectionOf(
    code: string,
    languages: readonly InterfaceLanguage[] = INTERFACE_LANGUAGES,
): TextDirection {
    return languages.find((language) => language.code === code)?.direction ?? 'ltr';
}
