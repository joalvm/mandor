import { documentYamlOf, type InteropCodec } from '@mandor/interop-core';
import type { WorkspaceKind } from '@mandor/schema';

import { documentsOf } from './export/documents-of.js';
import { readFiles } from './import/read-files.js';

/** The workspace bundle in the steps the pipeline takes, for the app that reads and writes it. */
export function mandorCodecFor(app: WorkspaceKind): InteropCodec {
    return {
        read: (files) => readFiles(files, app),
        documentsOf: (data) => documentsOf(data, app),
        textOf: documentYamlOf,
    };
}
