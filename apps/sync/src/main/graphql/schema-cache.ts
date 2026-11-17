import { mkdir, readFile } from 'node:fs/promises';

import { graphqlSchemaCacheSchema, type GraphqlSchemaCache } from '@mandor/schema';
import { atomicWrite, graphqlSchemaDir, graphqlSchemaFile } from '@mandor/store-fs';

/**
 * The schema kept for a key, or `null`. A file that is gone, cut short or from a later version is
 * the same thing here: nothing is kept, and asking the server again rebuilds it.
 */
export async function readSchemaCache(
    root: string,
    workspaceId: string,
    key: string,
): Promise<GraphqlSchemaCache | null> {
    try {
        const source = await readFile(graphqlSchemaFile(root, workspaceId, key), 'utf8');
        const parsed = graphqlSchemaCacheSchema.safeParse(JSON.parse(source));

        return parsed.success ? parsed.data : null;
    } catch {
        return null;
    }
}

/**
 * Keeps what a server answered. It is a border of the process that writes no text of the
 * user: the schema is the server's, in `.mandor/graphql`, which is never committed.
 */
export async function writeSchemaCache(
    root: string,
    workspaceId: string,
    key: string,
    cache: GraphqlSchemaCache,
): Promise<void> {
    await mkdir(graphqlSchemaDir(root, workspaceId), { recursive: true });
    await atomicWrite(graphqlSchemaFile(root, workspaceId, key), JSON.stringify(cache));
}
