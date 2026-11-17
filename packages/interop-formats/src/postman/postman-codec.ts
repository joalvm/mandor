import type { InteropCodec } from '@mandor/interop-core';

import { documentsOf } from './export/documents-of.js';
import { readFiles } from './import/read-files.js';

/** Postman in the steps the pipeline takes. Only `postmanFormat` loads this module. */
export const postmanCodec: InteropCodec = {
    read: readFiles,
    documentsOf,
    textOf: (document) => JSON.stringify(document, null, 2),
};
