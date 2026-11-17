import type { EditorLanguage } from '@mandor/ui';

/** The language an example is read in, by the type of content the document says it has. */
export function exampleLanguageOf(contentType: string): EditorLanguage {
    const type = contentType.toLowerCase();

    if (type.includes('json')) {
        return 'jsonc';
    }

    if (type.includes('xml')) {
        return 'xml';
    }

    return type.includes('html') ? 'html' : 'plaintext';
}
