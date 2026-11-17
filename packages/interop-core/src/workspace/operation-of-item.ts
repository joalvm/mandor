import {
    type CollectionItem,
    MESSAGE_PAYLOAD_TYPES,
    type MessagePayloadType,
} from '@mandor/schema';

import {
    INTEROP_DIRECTIONS,
    type InteropDirection,
    type InteropMessage,
    type InteropOperation,
} from '../ir/interop-document.js';

/**
 * The body keys this turn claims for typed fields: the envelope's own — kind, name, tags,
 * origin —, the ones the item model owns, and the ones the import writes so the workspace can
 * answer with what it is. Everything else the body holds stays loose and rides back as message
 * extras, which is what makes a key the import kept come out again.
 */
const CLAIMED_BODY_KEYS = new Set([
    'kind',
    'name',
    'tags',
    'origin',
    'channel',
    'payload',
    'payloadType',
    'schema',
    'expectAck',
    'direction',
    'security',
    'messageName',
]);

/**
 * One message item of the collection as the operation it is, under the channel that groups it.
 * The direction is already Mandor's — the import flipped the document's voice on the way in —
 * and the default is what Mandor sends, the ordinary case of a message somebody wrote to emit.
 */
export function operationOfItem(
    item: CollectionItem,
    channel: string,
    group: string,
): InteropOperation {
    return {
        name: item.name,
        channel,
        direction: directionOf(item),
        message: messageOf(item),
        security: securityOf(item),
        group,
        tags: item.tags,
        extras: {},
    };
}

function messageOf(item: CollectionItem): InteropMessage | undefined {
    const payload = stringOf(item.body, 'payload') ?? '';
    const name = stringOf(item.body, 'messageName') ?? item.name;
    const schema = stringOf(item.body, 'schema');

    return {
        name,
        payload,
        payloadType: payloadTypeOf(item.body),
        payloadSchema: schema === undefined || schema === '' ? undefined : name,
        headers: undefined,
        examples: payload === '' ? [] : [payload],
        extras: extrasOf(item),
    };
}

/**
 * What the body holds that no typed field claimed, riding back as it came. The description is
 * typed on the item but spoken by the message, so it travels here under the key the document
 * knows. A `$ref` never rides: it says where the source kept the content, and where is the
 * document's business — the content itself is already here, resolved.
 */
function extrasOf(item: CollectionItem): Record<string, unknown> {
    const extras: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(item.body)) {
        if (key !== '$ref' && !CLAIMED_BODY_KEYS.has(key)) {
            extras[key] = value;
        }
    }

    return extras;
}

function directionOf(item: CollectionItem): InteropDirection {
    const written = item.body['direction'];

    return INTEROP_DIRECTIONS.find((direction) => direction === written) ?? 'outgoing';
}

function securityOf(item: CollectionItem): string[] {
    const security = item.body['security'];

    if (!Array.isArray(security)) {
        return [];
    }

    return security.filter((name): name is string => typeof name === 'string');
}

function payloadTypeOf(body: Record<string, unknown>): MessagePayloadType | undefined {
    const payloadType = body['payloadType'];

    return MESSAGE_PAYLOAD_TYPES.find((each) => each === payloadType);
}

function stringOf(body: Record<string, unknown>, key: string): string | undefined {
    const value = body[key];

    return typeof value === 'string' ? value : undefined;
}
