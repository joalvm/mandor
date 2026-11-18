import type { InteropDocument } from '../ir/interop-document.js';
import type { ImportResource } from '../resource/import-resource.js';
import { withDocumentNotes } from '../resource/with-document-notes.js';
import type { InteropFile, InteropRead } from './interop-format.js';
import { soleFileOf } from './sole-file.js';

/** The two steps a format that reads one file takes after it has the file in hand. */
type ReadSteps = {
    /** Refuses with `problems` when the text is not a document of the format. */
    parse: (text: string) => InteropDocument | Promise<InteropDocument>;
    resourcesOf: (document: InteropDocument) => ImportResource[];
};

/**
 * What an import of one file does: the text to the model every importer shares, and the model to
 * what the workspace holds. The name the document gave itself travels with the resources, and what
 * it noted on the way in with the one that stands for it.
 */
export async function readSoleDocument(
    files: readonly InteropFile[],
    steps: ReadSteps,
): Promise<InteropRead> {
    const document = await steps.parse(soleFileOf(files).text);

    return {
        name: document.name,
        resources: withDocumentNotes(steps.resourcesOf(document), document.notes),
    };
}
