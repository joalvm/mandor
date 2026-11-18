import {
    collectionResourceOf,
    fingerprintOf,
    type ImportResource,
    type InteropChannel,
    type InteropDocument,
    type InteropOperation,
    underCollection,
} from '@mandor/interop-core';
import { slugify, type ItemOrigin } from '@mandor/schema';

import { connectionResourceOf } from './import-connection-resource.js';
import { payloadOf, schemaOf } from './payload-of-message.js';
import { operationGroupOf, tagsBesideGroup } from './operation-group.js';

// The envelope keys the collection owns. A document key by one of these names would write over
// the envelope itself, so it is kept aside instead of spread into the item.
const ENVELOPE_KEYS = new Set(['kind', 'name', 'tags', 'origin']);

/**
 * The whole document as the resources a workspace holds: one connection per server, one folder
 * per group the document tags its traffic with, and one item per operation the client can send —
 * the collection is a palette of things to emit, not a list of things to expect. The item is named
 * as the wire calls it, and carries its payload schema embedded, copied whole — a schema shared
 * by three operations is written three times, and the copy is the price of an item that reads
 * alone.
 */
export function importResourcesOf(document: InteropDocument): ImportResource[] {
    const collection = collectionResourceOf({
        name: document.name,
        origin: { kind: 'asyncapi', sourceId: document.sourceId },
    });
    const claims: Claims = { folders: new Map(), taken: new Map() };

    const items = document.operations
        .filter((operation) => operation.direction === 'outgoing')
        .map((operation) => itemResourceOf(operation, document, claims, collection.route));

    return [
        ...document.servers.map((server) => connectionResourceOf(server, document.sourceId)),
        collection,
        ...claims.folders.values(),
        ...items,
    ];
}

/** What an import keeps while it writes: the folders it opened and the slugs they took. */
type Claims = {
    folders: Map<string, ImportResource>;
    taken: Map<string, Set<string>>;
};

function itemResourceOf(
    operation: InteropOperation,
    document: InteropDocument,
    claims: Claims,
    collection: string,
): ImportResource {
    const group = operationGroupOf(operation, document);

    ensureFolder(group, document, claims.folders, collection);

    const tags = tagsBesideGroup(operation, group);
    const fields = {
        ...fieldsOf(operation, document),
        ...(tags.length === 0 ? {} : { tags }),
    };
    const name = nameOf(operation, document);
    const folderRoute =
        claims.folders.get(group)?.route ?? underCollection(collection, slugify(group));
    const used = claims.taken.get(folderRoute) ?? new Set<string>();
    const slug = slugify(name, [...used]);

    used.add(slug);
    claims.taken.set(folderRoute, used);

    return {
        place: 'item',
        itemKind: 'message',
        route: `${folderRoute}/${slug}`,
        name,
        fields,
        origin: originOf(document.sourceId, { name, ...fields }),
        degradations: [],
    };
}

/**
 * The folder a group of traffic travels under, written once and shared by its items. The group
 * name is the key: two operations of one group land in the same folder even when the folder's
 * route had to take a suffix to stay apart from another group's. Its doc is what the tags of the
 * document say of the group.
 */
function ensureFolder(
    name: string,
    document: InteropDocument,
    folders: Map<string, ImportResource>,
    collection: string,
): void {
    if (folders.has(name)) {
        return;
    }

    const route = underCollection(
        collection,
        slugify(
            name,
            [...folders.values()].map((folder) => folder.name),
        ),
    );

    const description = document.groups?.find((group) => group.path[0] === name)?.description;

    folders.set(name, {
        place: 'folder',
        itemKind: null,
        route,
        name,
        fields: { name, ...(description === undefined ? {} : { description }) },
        origin: { kind: 'asyncapi', sourceId: document.sourceId },
        degradations: [],
    });
}

/**
 * The channel address is the string that actually travels on the wire. Operation ids tend to be
 * handler-derived names (`handleLoginWeb.receive`), so they are only the last fallback for a
 * document that addresses nothing.
 */
function nameOf(operation: InteropOperation, document: InteropDocument): string {
    const address = channelOf(document, operation.channel)?.address;
    const candidates = [address, operation.message?.name, operation.channel, operation.name];

    return (
        candidates.find((value) => typeof value === 'string' && value.length > 0) ?? operation.name
    );
}

/**
 * The identity the item will carry, with the fingerprint of what this import owns — the name
 * and the fields, no more. The next import hashes the item the same way: equal means it is
 * still exactly what the import wrote, different means a person edited it since.
 */
function originOf(sourceId: string, owned: Record<string, unknown>): ItemOrigin {
    return { kind: 'asyncapi', sourceId, fingerprint: fingerprintOf(owned) };
}

function fieldsOf(operation: InteropOperation, document: InteropDocument): Record<string, unknown> {
    const message = operation.message;

    return {
        ...knownFieldsOf(operation, document),
        ...bookkeepingOf(operation),
        ...looseExtras(message?.extras),
    };
}

function knownFieldsOf(
    operation: InteropOperation,
    document: InteropDocument,
): Record<string, unknown> {
    const channel = channelOf(document, operation.channel);
    const message = operation.message;
    const schema = schemaOf(message, document);
    const described = message?.extras['description'];
    const description = typeof described === 'string' ? described : channel?.description;

    return {
        channel: channel?.address ?? operation.channel,
        payload: payloadOf(message, document),
        payloadType: 'json',
        ...(schema === undefined ? {} : { schema }),
        ...(description === undefined ? {} : { description }),
    };
}

/**
 * The keys the workspace answers with when the document leaves again: which way the operation
 * flows, who guards it, and what its message calls itself apart from the item that carries it.
 */
function bookkeepingOf(operation: InteropOperation): Record<string, unknown> {
    const name = operation.message?.name;
    const messageName = name === undefined || name === operation.name ? undefined : name;

    return {
        direction: operation.direction,
        ...(operation.security.length === 0 ? {} : { security: operation.security }),
        ...(messageName === undefined ? {} : { messageName }),
    };
}

function channelOf(document: InteropDocument, name: string): InteropChannel | undefined {
    return document.channels.find((each) => each.name === name);
}

/**
 * What the document carried that no field claimed rides into the item as loose keys of the
 * envelope — the wrapper keeps what Mandor does not understand. The keys the envelope owns
 * are left out: writing over them would be writing over the item itself.
 */
function looseExtras(extras: Record<string, unknown> | undefined): Record<string, unknown> {
    const loose: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(extras ?? {})) {
        if (!ENVELOPE_KEYS.has(key)) {
            loose[key] = value;
        }
    }

    return loose;
}
