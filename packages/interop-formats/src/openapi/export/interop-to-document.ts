import type { InteropDocument } from '@mandor/interop-core';

import { pathsOfDocument } from './document-paths.js';
import { securityOfDocument } from './document-security.js';
import { serversOfDocument } from './document-servers.js';

/** The version the document declares. The workspace keeps none, and the format asks for one. */
const DOCUMENT_VERSION = '1.0.0';

/**
 * The intermediate model as the OpenAPI 3.1 document it describes — the road in, travelled the
 * other way. Only 3.1 comes out: importing reads the older formats, exporting keeps one. What
 * the workspace never held is not invented: the sections it cannot name are simply not written,
 * and the paths are there even when they hold nothing — the one section 3.1 asks for.
 */
export function irToDocument(ir: InteropDocument): Record<string, unknown> {
    const security = securityOfDocument(ir);
    const components =
        security.securitySchemes === undefined ? {} : { securitySchemes: security.securitySchemes };
    const servers = serversOfDocument(ir.servers);
    const tags = tagsOf(ir);

    return {
        openapi: '3.1.0',
        info: { title: ir.name, version: DOCUMENT_VERSION },
        ...(tags.length === 0 ? {} : { tags }),
        ...(servers.length === 0 ? {} : { servers }),
        ...(security.security === undefined ? {} : { security: security.security }),
        paths: pathsOfDocument(ir),
        ...emptyAside(components, 'components'),
        ...ir.extras,
    };
}

/**
 * One tag per group of the first level some operation files under, in the order of the groups and
 * with their doc: deeper ones flatten into it, and only it has a tag to speak in.
 */
function tagsOf(ir: InteropDocument): Record<string, unknown>[] {
    const used = new Set(ir.operations.flatMap((operation) => operation.http?.tags ?? []));

    return (ir.groups ?? [])
        .filter(({ path }) => path.length === 1)
        .flatMap(({ path, description }) =>
            path
                .filter((name) => used.has(name))
                .map((name) => ({
                    name,
                    ...(description === undefined ? {} : { description }),
                })),
        );
}

/** A section the model fills nobody enters: an absent key and an empty one read the same. */
function emptyAside(section: Record<string, unknown>, name: string): Record<string, unknown> {
    return Object.keys(section).length === 0 ? {} : { [name]: section };
}
