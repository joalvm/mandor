import type { InteropCodec } from '@mandor/interop-core';

import { readFiles } from './import/read-files.js';

const NO_EXPORT = 'HAR is only imported';

/** HAR in the steps the pipeline takes. Only `harFormat` loads this module. */
export const harCodec: InteropCodec = {
    read: readFiles,
    documentsOf: () => {
        throw new Error(NO_EXPORT);
    },
    textOf: () => {
        throw new Error(NO_EXPORT);
    },
};
