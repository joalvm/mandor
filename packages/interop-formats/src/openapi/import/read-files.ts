import {
    readSoleDocument,
    type InteropFile,
    type InteropRead,
    type InteropScope,
} from '@mandor/interop-core';

import { documentToInterop } from './document-to-interop.js';
import { importResourcesOf } from './import-resources.js';

/**
 * An OpenAPI import: its one document, to the model and from there to what the workspace holds.
 * The scope decides what its requests lean on, the environment or the server itself.
 */
export function readFiles(
    files: readonly InteropFile[],
    scope: InteropScope,
): Promise<InteropRead> {
    return readSoleDocument(files, {
        parse: documentToInterop,
        resourcesOf: (document) => importResourcesOf(document, scope),
    });
}
