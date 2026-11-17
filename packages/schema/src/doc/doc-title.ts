import { DOC_EXTENSION } from './doc-name.js';

/**
 * The two spellings of the same doc. On disk it is a markdown file and the extension is part of
 * its name; on screen it is a document, and an extension repeated down a list says nothing that
 * the glyph beside it did not already say.
 *
 * Both directions are needed at once: the list draws the title and the rename sends back the
 * file name, so a person who does type `.md` gets the file they meant and not `notas.md.md`.
 */
export function docTitle(name: string): string {
    return name.endsWith(DOC_EXTENSION) ? name.slice(0, -DOC_EXTENSION.length) : name;
}

/** The file name of a doc id. Markdown is the only thing `docs/` holds. */
export function docFileName(id: string): string {
    return `${docTitle(id.trim())}${DOC_EXTENSION}`;
}
