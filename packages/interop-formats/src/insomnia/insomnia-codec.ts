import { documentYamlOf, type InteropCodec } from '@mandor/interop-core';

import { documentsOf } from './export/documents-of.js';
import { readFiles } from './import/read-files.js';

/** Insomnia in the steps the pipeline takes. Only `insomniaFormat` loads this module. */
export const insomniaCodec: InteropCodec = {
    read: readFiles,
    documentsOf,
    textOf: documentYamlOf,
};
