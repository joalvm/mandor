import { describe, expect, it } from 'vitest';

import { messageOf } from '../../../src/asyncapi/import/map-messages.js';
import { parseAsyncapiDocument } from '../../../src/asyncapi/document/parse-asyncapi-document.js';
import type { InteropMessage, InteropPayloadSchema } from '@mandor/interop-core';

async function messageOfFixture(): Promise<{
    message: InteropMessage;
    payloadSchemas: Record<string, InteropPayloadSchema>;
}> {
    const { document, raw } = await parseAsyncapiDocument(
        JSON.stringify({
            asyncapi: '3.0.0',
            info: { title: 't', version: '1' },
            channels: {
                a: {
                    messages: {
                        m: { payload: { type: 'object' }, examples: [{ payload: { id: '1' } }] },
                    },
                },
            },
        }),
    );

    const payloadSchemas: Record<string, InteropPayloadSchema> = {};
    const channel = document.channels().all()[0];

    if (channel === undefined) {
        throw new Error('the fixture has no channel');
    }

    const channelMessage = channel.messages().all()[0];

    if (channelMessage === undefined) {
        throw new Error('the fixture has no message');
    }

    const shaped = raw as { channels?: { a?: { messages?: { m?: Record<string, unknown> } } } };
    const message = messageOf(
        channelMessage,
        shaped.channels?.a?.messages?.m,
        'entrega',
        payloadSchemas,
    );

    return { message: message, payloadSchemas };
}

describe('messageOf', () => {
    it('registers the payload schema under the name of the message and points at it', async () => {
        const { message, payloadSchemas } = await messageOfFixture();

        expect(message.payloadSchema).toBe('m');
        expect(payloadSchemas['m']?.text).toContain('"type"');
    });

    it('reads as json what the document wrote as a JSON Schema', async () => {
        const { message } = await messageOfFixture();

        expect(message.payloadType).toBe('json');
    });

    it('keeps the sample payloads the document shipped', async () => {
        const { message } = await messageOfFixture();

        expect(message.examples).toEqual(['{"id":"1"}']);
    });
});
