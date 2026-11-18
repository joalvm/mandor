import type { AsyncAPIDocumentInterface } from '@asyncapi/parser';
import {
    type InteropDocument,
    type InteropGroup,
    type InteropPayloadSchema,
    isRecord,
} from '@mandor/interop-core';

import { documentSourceId } from '../document/document-source-id.js';
import { domainOfTag } from '../document/group-tag.js';
import { channelsOf } from './map-channels.js';
import { securitySchemesOf } from './map-security.js';
import { operationsOf } from './map-operations.js';
import { serversOf } from './map-servers.js';
import { parseAsyncapiDocument } from '../document/parse-asyncapi-document.js';
import { unknownKeys } from '../document/unknown-keys.js';

const TOP_LEVEL_KNOWN = [
    'asyncapi',
    'info',
    'tags',
    'servers',
    'channels',
    'operations',
    'components',
];
const COMPONENTS_KNOWN = ['messages', 'securitySchemes'];

/**
 * An AsyncAPI document in, the shared intermediate model out. Everything the pipeline does next
 * — the plan, the apply — reads this and never learns which format it came from.
 * The text is hashed as it arrived: the identity is the user's bytes, so the same file imported
 * twice is one update and never a duplicate.
 */
export async function documentToInterop(text: string): Promise<InteropDocument> {
    const { document, raw } = await parseAsyncapiDocument(text);
    const schemes = securitySchemesOf(raw);
    const payloadSchemas: Record<string, InteropPayloadSchema> = {};
    const groups = groupsOf(document);

    return {
        name: document.info().title(),
        sourceId: documentSourceId(text),
        servers: serversOf(document, raw, schemes),
        security: schemes,
        channels: channelsOf(document, raw),
        operations: operationsOf(document, raw, schemes, payloadSchemas),
        defaultSecurity: [],
        payloadSchemas,
        notes: [],
        extras: extrasOf(raw),
        ...(groups.length === 0 ? {} : { groups }),
    };
}

/**
 * What the tags of the document say of its groups: their doc. The parser reads them where each
 * version keeps them: at the root in 2.x, in `info` from 3 on. A tag with nothing to say is left out.
 */
function groupsOf(document: AsyncAPIDocumentInterface): InteropGroup[] {
    return document
        .info()
        .tags()
        .all()
        .flatMap((tag) => {
            const description = tag.description();

            return description === undefined
                ? []
                : [
                      {
                          path: [domainOfTag(tag.name()) ?? tag.name()],
                          description,
                          security: null,
                          scripts: [],
                          extras: {},
                      },
                  ];
        });
}

/**
 * What the document carried that no mapping claimed — top level and inside `components` alike.
 * The parser's annotations are never content and are gone before anything here reaches disk.
 */
function extrasOf(raw: Record<string, unknown>): Record<string, unknown> {
    const extras = unknownKeys(raw, TOP_LEVEL_KNOWN);
    const components = raw['components'];
    const leftover = isRecord(components) ? unknownKeys(components, COMPONENTS_KNOWN) : {};

    if (Object.keys(leftover).length > 0) {
        extras['components'] = leftover;
    }

    return extras;
}
