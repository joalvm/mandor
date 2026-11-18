import type { MessageItem } from './message-item.js';

/**
 * The keys a message writes beside the envelope of the collection. All five are named every time,
 * with nothing behind the ones the message does not have: that is what tells the writer the
 * field is gone. Leaving a key out would mean «do not touch it», which is the promise that keeps
 * the keys of the other app safe and would here keep a value somebody just erased.
 */
export function messageItemBody(message: MessageItem): Record<string, unknown> {
    const { channel, description, payload, payloadType, schema } = message;

    return {
        channel,
        payload: payload === '' ? undefined : payload,
        payloadType,
        schema: schema === '' ? undefined : schema,
        description,
    };
}
