import type {
    InteropChannel,
    InteropDirection,
    InteropDocument,
    InteropMessage,
    InteropOperation,
    InteropPayloadSchema,
} from '@mandor/interop-core';

import { groupTagOf } from '../document/group-tag.js';

type Message = Record<string, unknown>;

/** The AsyncAPI action each direction of the IR is written as. */
const ACTIONS: Record<InteropDirection, string> = { incoming: 'send', outgoing: 'receive' };

/**
 * What the traffic section shares while it is written: which schemas several operations
 * promise, and where the bodies of those shared schemas land as they arrive.
 */
type Traffic = {
    schemas: Record<string, InteropPayloadSchema>;
    shared: Set<string>;
    bodies: Record<string, Message>;
};

/**
 * The addresses and the traffic: channels, the operations that travel them, and the messages
 * with their schemas. A schema one operation uses stays beside its channel; one several
 * operations promise moves to `components.messages`, and every operation points at it — the
 * way in, read the other way.
 */
export function trafficOfDocument(ir: InteropDocument): {
    channels: Record<string, unknown>;
    operations: Record<string, unknown>;
    components: Record<string, unknown>;
} {
    const traffic: Traffic = {
        schemas: ir.payloadSchemas,
        shared: sharedSchemaNames(ir.operations),
        bodies: {},
    };
    const channels: Record<string, unknown> = {};
    const operations: Record<string, unknown> = {};

    for (const channel of ir.channels) {
        channels[channel.name] = channelOf(channel, ir, traffic);
    }

    for (const operation of ir.operations) {
        operations[operation.name] = operationOf(operation, traffic);
    }

    const components: Record<string, unknown> =
        Object.keys(traffic.bodies).length === 0 ? {} : { messages: traffic.bodies };

    return { channels, operations, components };
}

function sharedSchemaNames(operations: readonly InteropOperation[]): Set<string> {
    const uses = new Map<string, number>();

    for (const operation of operations) {
        const schema = operation.message?.payloadSchema;

        if (schema !== undefined) {
            uses.set(schema, (uses.get(schema) ?? 0) + 1);
        }
    }

    return new Set([...uses].filter(([, count]) => count > 1).map(([name]) => name));
}

function channelOf(
    channel: InteropChannel,
    ir: InteropDocument,
    traffic: Traffic,
): Record<string, unknown> {
    const travelling = ir.operations.filter((operation) => operation.channel === channel.name);

    return {
        address: channel.address,
        ...(channel.description === undefined ? {} : { description: channel.description }),
        ...messagesAside(travelling, traffic),
        ...channel.extras,
    };
}

/**
 * The messages of one channel, under the alias each answers to. A shared schema lands as a
 * pointer at its body in `components`; a message of its own lands whole. The operations point
 * here either way: in 3.x an operation message has to belong to the channel it travels.
 */
function messagesAside(
    travelling: readonly InteropOperation[],
    traffic: Traffic,
): Record<string, unknown> {
    const aliases: Record<string, Message> = {};

    for (const operation of travelling) {
        const message = operation.message;

        if (message === undefined) {
            continue;
        }

        const alias = message.name ?? operation.name;
        const schema = message.payloadSchema;

        aliases[alias] =
            schema !== undefined && traffic.shared.has(schema)
                ? { $ref: `#/components/messages/${pointerOf(schema)}` }
                : messageOf(message, traffic.schemas);
    }

    return Object.keys(aliases).length === 0 ? {} : { messages: aliases };
}

function operationOf(operation: InteropOperation, traffic: Traffic): Record<string, unknown> {
    return {
        action: ACTIONS[operation.direction],
        channel: { $ref: `#/channels/${pointerOf(operation.channel)}` },
        ...messagesRefOf(operation, traffic),
        ...tagsOf(operation),
        ...(operation.security.length === 0 ? {} : { security: securityOf(operation.security) }),
    };
}

/** The tag of the group goes first: it is the one that opens the folder again on the way back in. */
function tagsOf(operation: InteropOperation): Record<string, unknown> {
    const names = [
        ...(operation.group === undefined ? [] : [groupTagOf(operation.group)]),
        ...(operation.tags ?? []),
    ];

    return names.length === 0 ? {} : { tags: names.map((name) => ({ name })) };
}

function messagesRefOf(operation: InteropOperation, traffic: Traffic): Record<string, unknown> {
    const message = operation.message;
    const alias = message?.name ?? operation.name;

    if (message === undefined) {
        return {};
    }

    const schema = message.payloadSchema;

    if (schema !== undefined && traffic.shared.has(schema)) {
        shareBodyOf(message, schema, traffic);
    }

    return {
        messages: [
            { $ref: `#/channels/${pointerOf(operation.channel)}/messages/${pointerOf(alias)}` },
        ],
    };
}

/** The body of a schema several operations promise is written once, under the name they share. */
function shareBodyOf(message: InteropMessage, schema: string, traffic: Traffic): void {
    if (!(schema in traffic.bodies)) {
        traffic.bodies[schema] = messageOf(message, traffic.schemas);
    }
}

/**
 * One message as the document speaks it: the schema it promises, the samples it shipped, and
 * whatever else it carried. The schema travels as the object the format wants; text that does
 * not parse arrives empty rather than half-written.
 */
function messageOf(
    message: InteropMessage,
    schemas: Record<string, InteropPayloadSchema>,
): Message {
    const written: Message = {};
    const schema = message.payloadSchema;

    if (schema !== undefined) {
        written['payload'] = parseOf(schemas[schema]?.text);
    }

    if (message.examples.length > 0) {
        // The import unwrapped the `payload` an example carries and kept the sample alone;
        // the format wants the envelope back, so out it goes wrapped the same way.
        written['examples'] = message.examples.map((sample) => ({ payload: parseOf(sample) }));
    }

    Object.assign(written, message.extras);

    return written;
}

/** In 3.x a security entry is the scheme itself, pointed at — not the named map 2.x used. */
function securityOf(names: readonly string[]): Record<string, unknown>[] {
    return names.map((name) => ({ $ref: `#/components/securitySchemes/${pointerOf(name)}` }));
}

function parseOf(text: string | undefined): unknown {
    if (text === undefined) {
        return {};
    }

    try {
        return JSON.parse(text) as unknown;
    } catch {
        return {};
    }
}

/** A JSON pointer says a name with `/` as `~1` and a name with `~` as `~0`. */
function pointerOf(name: string): string {
    return name.replace(/~/gu, '~0').replace(/\//gu, '~1');
}
