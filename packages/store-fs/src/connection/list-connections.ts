import { byName, type Connection, parseConnection } from '@mandor/schema';

import type { LoadWarning } from '../disk/load-warning.js';
import { readDocument } from '../disk/read-document.js';
import { connectionIds } from './connection-ids.js';
import { connectionFile } from './connection-path.js';

export type ListedConnections = {
    connections: Connection[];
    warnings: LoadWarning[];
};

/**
 * Reads every connection of a workspace, sorted by name. Connections have no order of their own:
 * nobody arranges them, and their ids mean nothing to the person reading the list.
 */
export async function listConnections(
    root: string,
    workspaceId: string,
): Promise<ListedConnections> {
    const ids = await connectionIds(root, workspaceId);
    const reads = await Promise.all(
        ids.map((id) => readDocument(connectionFile(root, workspaceId, id), parseConnection)),
    );

    return {
        connections: reads
            .filter((read) => read.ok)
            .map((read) => read.value)
            .toSorted(byName),
        warnings: reads.filter((read) => !read.ok).map((read) => read.warning),
    };
}
