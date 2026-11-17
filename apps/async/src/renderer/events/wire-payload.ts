import type { MessagePayloadType } from '@mandor/schema';
import { wireJson } from '@mandor/validate';

function asWritten(text: string): string {
    return text;
}

const WIRE_OF: Readonly<Record<MessagePayloadType, (text: string) => string>> = {
    binary: asWritten,
    json: wireJson,
    text: asWritten,
};

/**
 * The text that travels on the wire. A json payload is written as JSONC, so it leaves as the
 * JSON it means; a text or a binary payload declares nothing of the kind and leaves exactly as
 * it reads.
 */
export function wirePayload(text: string, payloadType: MessagePayloadType): string {
    return WIRE_OF[payloadType](text);
}
