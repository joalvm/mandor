import { mkdir } from 'node:fs/promises';

import {
    type Connection,
    createConnection as buildConnection,
    type CreateConnectionInput,
} from '@mandor/schema';

import { NameTakenError } from '../collection/name-taken-error.js';
import { documentOf } from '../disk/document-of.js';
import { writeDocument } from '../disk/write-document.js';
import { connectionIds } from './connection-ids.js';
import { connectionFile, connectionsDir } from './connection-path.js';

/** What the caller decides, the id included: the caller mints it, this only refuses a repeat. */
export type NewConnection = CreateConnectionInput;

/** Creates a connection inside a workspace. One file per connection, named after its id. */
export async function createConnection(
    root: string,
    workspaceId: string,
    input: NewConnection,
): Promise<Connection> {
    const written = await connectionIds(root, workspaceId);

    if (written.includes(input.id)) {
        throw new NameTakenError(input.id);
    }

    const connection = buildConnection(input);
    const path = connectionFile(root, workspaceId, connection.id);

    await mkdir(connectionsDir(root, workspaceId), { recursive: true });
    await writeDocument(path, documentOf(connection), {});

    return connection;
}
