import type { InteropDocument } from '@mandor/interop-core';

import { groupTagOf } from '../document/group-tag.js';
import { trafficOfDocument } from './document-operations.js';
import { serversOfDocument } from './document-servers.js';

/** The version the document declares. The workspace keeps none, and the format asks for one. */
const DOCUMENT_VERSION = '1.0.0';

/**
 * The intermediate model as the AsyncAPI 3 document it describes — the road in, travelled the
 * other way. Only 3 comes out: importing reads the older formats, exporting keeps one. What the
 * workspace never held is not invented: the sections it cannot name are simply not written.
 */
export function irToDocument(ir: InteropDocument): Record<string, unknown> {
    const traffic = trafficOfDocument(ir);
    const security = securityOfDocument(ir);
    const components: Record<string, unknown> = { ...traffic.components, ...security };
    const tags = tagsOf(ir);

    return {
        asyncapi: '3.0.0',
        info: {
            title: ir.name,
            version: DOCUMENT_VERSION,
            ...(tags.length === 0 ? {} : { tags }),
        },
        ...emptyAside(serversOfDocument(ir.servers), 'servers'),
        ...emptyAside(traffic.channels, 'channels'),
        ...emptyAside(traffic.operations, 'operations'),
        ...emptyAside(components, 'components'),
        ...ir.extras,
    };
}

/**
 * The doc of each group of the first level, in the tag its operations carry: deeper ones flatten
 * into it, and only it has a tag to speak in.
 */
function tagsOf(ir: InteropDocument): Record<string, unknown>[] {
    return (ir.groups ?? [])
        .filter(({ path, description }) => path.length === 1 && description !== undefined)
        .flatMap(({ path, description }) =>
            path.map((name) => ({ name: groupTagOf(name), description })),
        );
}

function securityOfDocument(ir: InteropDocument): Record<string, unknown> {
    const schemes = Object.entries(ir.security);

    if (schemes.length === 0) {
        return {};
    }

    return {
        securitySchemes: Object.fromEntries(
            schemes.map(([name, scheme]) => [name, { type: scheme.type, ...scheme.extras }]),
        ),
    };
}

/** A section the model fills nobody enters: an absent key and an empty one read the same. */
function emptyAside(section: Record<string, unknown>, name: string): Record<string, unknown> {
    return Object.keys(section).length === 0 ? {} : { [name]: section };
}
