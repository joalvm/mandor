import { readSoleDocument, type InteropFile, type InteropRead } from '@mandor/interop-core';

import { documentSourceId } from '../document/document-source-id.js';
import { parseHarDocument } from '../document/parse-har-document.js';
import { documentToInterop } from './document-to-interop.js';
import { importResourcesOf } from './import-resources.js';

/** A HAR import: its one recording, to the model and from there to what the workspace holds. */
export function readFiles(files: readonly InteropFile[]): Promise<InteropRead> {
    return readSoleDocument(files, {
        parse: (text) => documentToInterop(parseHarDocument(text), documentSourceId(text)),
        resourcesOf: importResourcesOf,
    });
}
