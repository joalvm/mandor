import { workspaceToIr, type FormatFile, type WorkspaceData } from '@mandor/interop-core';
import { slugify } from '@mandor/schema';

import { irToDocument } from './interop-to-document.js';

/** The workspace as the one AsyncAPI document it describes, in a file named after it. */
export function documentsOf(data: WorkspaceData): FormatFile[] {
    return [{ path: `${slugify(data.name)}.yaml`, document: irToDocument(workspaceToIr(data)) }];
}
