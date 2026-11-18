import { readSoleDocument, type InteropFile, type InteropRead } from '@mandor/interop-core';

import { documentToInterop } from './document-to-interop.js';
import { importResourcesOf } from './import-resources.js';

/** An AsyncAPI import: its one document, to the model and from there to what the workspace holds. */
export function readFiles(files: readonly InteropFile[]): Promise<InteropRead> {
    return readSoleDocument(files, { parse: documentToInterop, resourcesOf: importResourcesOf });
}
