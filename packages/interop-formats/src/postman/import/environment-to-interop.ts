import type { InteropDocument } from '@mandor/interop-core';

import { documentSourceId } from '../document/document-source-id.js';
import type { PostmanEnvironment } from '../document/postman-environment-schema.js';
import { variableOf } from './variable-of.js';

/** The name of the document: globals take a fixed one, an environment keeps its own. */
const NAMES: Record<'environment' | 'globals', (environment: PostmanEnvironment) => string> = {
    environment: (environment) => environment.name,
    globals: () => 'globals',
};

/**
 * An environment or a globals file as a document with nothing in it but the environment:
 * Postman keeps variables apart from requests, and so does the file. Globals take the name
 * `globals`, since the name they carry is the workspace's.
 */
export function environmentToInterop(
    kind: 'environment' | 'globals',
    environment: PostmanEnvironment,
): InteropDocument {
    const name = NAMES[kind](environment);

    return {
        name,
        sourceId: documentSourceId(kind, environment.id, environment.name),
        servers: [],
        security: {},
        channels: [],
        operations: [],
        defaultSecurity: [],
        payloadSchemas: {},
        notes: [],
        extras: {},
        environments: [
            {
                name,
                variables: environment.values.map((row) => variableOf(row, row.enabled ?? true)),
                extras: { scope: kind },
            },
        ],
    };
}
