import { documentYamlOf, type InteropCodec } from '@mandor/interop-core';

import { documentsOf } from './export/documents-of.js';
import { readFiles } from './import/read-files.js';

/**
 * OpenAPI in the steps the pipeline takes: it reads the 3.x and 2.0 document an import brings
 * and becomes workspace resources; it writes the workspace as the 3.1 document it describes, in
 * YAML, the shape the export hands the user.
 */
export const openapiCodec: InteropCodec = {
    read: readFiles,
    documentsOf,
    textOf: documentYamlOf,
};
