import { parseWorkspace, type Workspace } from '@mandor/schema';

import { type DocumentRead, readDocument } from '../disk/read-document.js';
import { workspaceFile } from './workspace-path.js';

/** Reads one workspace. A workspace that fails to load is a warning, never an exception. */
export function readWorkspace(root: string, workspaceId: string): Promise<DocumentRead<Workspace>> {
    return readDocument(workspaceFile(root, workspaceId), parseWorkspace);
}
