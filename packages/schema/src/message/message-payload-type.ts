/**
 * How the payload of a message is meant to be read. A closed list: what the editor highlights
 * and what a transport frames are decisions, and a free string would leave both to chance.
 */
export const MESSAGE_PAYLOAD_TYPES = ['json', 'text', 'binary'] as const;

export type MessagePayloadType = (typeof MESSAGE_PAYLOAD_TYPES)[number];

/**
 * Narrows what an interface reports back, so the type never becomes an unchecked string. A
 * picker offers the three and nothing else, and a file that named something else is read as
 * JSON: that is what the message says it is until somebody says otherwise.
 */
export function parseMessagePayloadType(value: string): MessagePayloadType {
    return MESSAGE_PAYLOAD_TYPES.find((each) => each === value) ?? 'json';
}
