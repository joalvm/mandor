import { type Connection, parseConnection } from '@mandor/schema';

import { atomicWrite } from '../disk/atomic-write.js';
import { readOrThrow } from '../disk/read-or-throw.js';
import { type ConnectionPatch, editConnectionDocument } from './connection-text-with.js';
import { connectionFile } from './connection-path.js';

/**
 * Applies changes to a connection. The result is validated before anything is written, so a
 * change the domain rejects leaves the file exactly as it was. It reads and writes back: two edits
 * of one file run one after the other in the turn of the repo the caller holds.
 */
export async function updateConnection(
    root: string,
    workspaceId: string,
    connectionId: string,
    changes: ConnectionPatch,
): Promise<Connection> {
    const path = connectionFile(root, workspaceId, connectionId);
    const read = await readOrThrow(path, parseConnection);
    const edited = editConnectionDocument(read.document, read.value, changes);

    await atomicWrite(path, edited.text);

    return edited.updated;
}
