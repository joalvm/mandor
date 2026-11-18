import type { MessageInterface } from '@asyncapi/parser';
import { type InteropMessage, type InteropPayloadSchema, isRecord } from '@mandor/interop-core';

import { stripParserNotes } from '../document/parser-notes.js';
import { unknownKeys } from '../document/unknown-keys.js';

// `$ref` is how the source document pointed at content held elsewhere; the content arrives
// resolved, and where it used to live is addressing, not something the item should keep.
const KNOWN = ['payload', 'name', 'examples', 'headers', 'messageId', '$ref'];

/**
 * The message an operation carries. Its payload schema is registered under the message's own
 * name and the message points at it — that pointer is what the writer of the item turns into
 * the embedded `schema` key, copied whole, once per message that uses it.
 */
export function messageOf(
    message: MessageInterface,
    rawMessage: Record<string, unknown> | undefined,
    fallbackName: string,
    payloadSchemas: Record<string, InteropPayloadSchema>,
): InteropMessage {
    // The model types name() and id() as always-present, but at runtime either can come back
    // empty — a message resolved from `components` has no name, an inline one has no id — so
    // both go through an unknown round-trip before falling back.
    const declaredName: unknown = message.name();
    const declaredId: unknown = message.id();
    const named = typeof declaredName === 'string' ? declaredName : undefined;
    const identified = typeof declaredId === 'string' ? declaredId : undefined;
    const name = named ?? identified ?? fallbackName;
    const payload = message.payload();
    const examples = examplesOf(message);

    return {
        name,
        // The sample the document shipped is what the item opens with on the way back: the
        // workspace reads this field as the body, and an absent one would read as an empty one.
        payload: examples[0],
        payloadType: payload === undefined ? undefined : 'json',
        payloadSchema:
            payload === undefined ? undefined : registerSchema(name, payload, payloadSchemas),
        headers: undefined,
        examples,
        extras: rawMessage === undefined ? {} : unknownKeys(rawMessage, KNOWN),
    };
}

function registerSchema(
    name: string,
    payload: { json(): unknown },
    payloadSchemas: Record<string, InteropPayloadSchema>,
): string {
    payloadSchemas[name] = {
        text: JSON.stringify(stripParserNotes(payload.json()), null, 2),
        extras: {},
    };

    return name;
}

function examplesOf(message: MessageInterface): string[] {
    return message.examples().map((example) => {
        const written = stripParserNotes(example.json());
        const sample = isRecord(written) && 'payload' in written ? written['payload'] : written;

        return JSON.stringify(sample);
    });
}
