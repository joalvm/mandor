import {
    degradation,
    type Degradation,
    type InteropDocument,
    type InteropGroup,
} from '@mandor/interop-core';

import { documentSourceId } from '../document/document-source-id.js';
import { asRecord, listAt, recordAt, textAt } from '../document/node-access.js';
import { parseOpenapiDocument } from '../document/parse-openapi-document.js';
import { channelsOf } from './map-channels.js';
import { operationsOf } from './map-operations.js';
import { securityNamesOf, securitySchemesOf } from './map-security.js';
import { serversOf } from './map-servers.js';
import { rootExtrasOf } from './root-extras.js';
import { workspaceAuthNotesOf } from './workspace-auth.js';

/**
 * An OpenAPI or Swagger document in, the shared intermediate model out. Everything the pipeline
 * does next reads this and never learns which format it came from. The identity is the title of
 * the API, not the text: the text changes with every release, the API does not.
 */
export async function documentToInterop(text: string): Promise<InteropDocument> {
    const { document, notes } = await parseOpenapiDocument(text);
    const root = rootExtrasOf(document);
    const name = String(recordAt(document, 'info')['title']).trim();
    const groups = groupsOf(document);
    const interop: InteropDocument = {
        name,
        sourceId: documentSourceId(name),
        servers: serversOf(document),
        security: securitySchemesOf(recordAt(document, 'components')),
        channels: channelsOf(document),
        operations: operationsOf(document),
        defaultSecurity: securityNamesOf(document['security']),
        payloadSchemas: {},
        notes: [],
        extras: root.extras,
        ...(groups.length === 0 ? {} : { groups }),
    };

    return { ...interop, notes: [...notes, ...root.notes, ...importNotesOf(interop)] };
}

/** The tags at the root as the groups they declare: their order, and the doc of each. */
function groupsOf(document: Record<string, unknown>): InteropGroup[] {
    return listAt(document, 'tags')
        .map(asRecord)
        .map((tag) => ({
            path: [String(tag['name'])],
            description: textAt(tag, 'description'),
            security: null,
            scripts: [],
            extras: {},
        }));
}

/** What the import will leave for the person to do, said once for the whole document. */
function importNotesOf(document: InteropDocument): Degradation[] {
    return [
        ...workspaceAuthNotesOf(document),
        ...(document.servers.length === 0 ? [degradation('noServer')] : []),
    ];
}
