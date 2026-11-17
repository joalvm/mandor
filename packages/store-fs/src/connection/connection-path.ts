import { join } from 'node:path';

import { assertSegment } from '@mandor/schema';

import { workspaceDir } from '../workspace/workspace-path.js';

const CONNECTIONS_DIR = 'connections';

/** One connection, one file: a conflict stays inside the connection that was touched. */
export function connectionsDir(root: string, workspaceId: string): string {
    return join(workspaceDir(root, workspaceId), CONNECTIONS_DIR);
}

/** Path of one async connection. Both ids are validated before they reach `join`. */
export function connectionFile(root: string, workspaceId: string, connectionId: string): string {
    assertSegment(connectionId);

    return join(connectionsDir(root, workspaceId), `${connectionId}.yaml`);
}
