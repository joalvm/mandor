import { parseWith } from '../format/parse-with.js';
import type { MessageItem } from './message-item.js';
import { messageItemSchema } from './message-item-schema.js';
import type { MessagePayloadType } from './message-payload-type.js';

export type CreateMessageItemInput = {
    name: string;
    channel?: string | undefined;
    payload?: string | undefined;
    description?: string | undefined;
    payloadType?: MessagePayloadType | undefined;
    schema?: string | undefined;
};

/** Makes a message with nothing but a name. The rest is what the person has not written yet. */
export function createMessageItem(input: CreateMessageItemInput): MessageItem {
    return parseWith(messageItemSchema, input);
}
