import { documentYamlOf, type InteropCodec } from '@mandor/interop-core';

import { documentsOf } from './export/documents-of.js';
import { readFiles } from './import/read-files.js';

/** Bruno in the steps the pipeline takes. Only `brunoFormat` loads this module. */
export const brunoCodec: InteropCodec = {
    read: readFiles,
    documentsOf,
    textOf: documentYamlOf,
};
