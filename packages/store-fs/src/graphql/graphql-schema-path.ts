import { join } from 'node:path';

import { assertSegment } from '@mandor/schema';

import { mandorDir } from '../repo/repo-path.js';

const GRAPHQL_DIR = 'graphql';
const KEY = /^[0-9a-f]{64}$/;

/** Where the schemas of one workspace are kept, inside `.mandor`: it never goes to git. */
export function graphqlSchemaDir(root: string, workspaceId: string): string {
    assertSegment(workspaceId);

    return join(mandorDir(root), GRAPHQL_DIR, workspaceId);
}

/** The file of one schema; only a sha-256 in lowercase hex names it, so a key cannot walk out. */
export function graphqlSchemaFile(root: string, workspaceId: string, key: string): string {
    if (!KEY.test(key)) {
        throw new Error('A cached schema is named by a sha-256 in lowercase hex');
    }

    return join(graphqlSchemaDir(root, workspaceId), `${key}.json`);
}
