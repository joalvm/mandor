import type { useMessages } from '@mandor/i18n';

type ConflictMessages = ReturnType<typeof useMessages<'conflicts'>>;

/**
 * What a part of an entity is called to the person. The words are the app's when it has them
 * (`headers` → «Cabeceras»), and the key itself when it has not: a part nobody named still
 * shows what it is, never an empty heading. The whole file, which has no key, is «Archivo».
 */
export function sectionTitle(messages: ConflictMessages, key: string): string {
    if (key === '') {
        return messages('section.file');
    }

    // The key comes off a path, not off the collection, so the collection's own fallback is the point.
    return messages(`section.${key}` as 'section.file', { defaultValue: key });
}
