import { formattedJsonc, type EditorLanguage } from '@mandor/ui';

/**
 * The text of the body of an example as the editor draws it. A body is kept as it came, which
 * for JSON is one line, and a line of that kind is not something to read: it is laid out here,
 * without touching what the file holds. A body with lines of its own is the author's layout and
 * is left alone, as is one that does not parse.
 */
export function bodyShownOf(body: string, language: EditorLanguage): string {
    if (language !== 'jsonc' || body.includes('\n')) {
        return body;
    }

    return formattedJsonc(body) ?? body;
}
