import { documentYamlOf, type InteropCodec } from '@mandor/interop-core';

import { documentsOf } from './export/documents-of.js';
import { readFiles } from './import/read-files.js';

/** AsyncAPI in the steps the pipeline takes. Only `asyncapiFormat` loads this module. */
export const asyncapiCodec: InteropCodec = {
    read: readFiles,
    documentsOf,
    textOf: documentYamlOf,
};
