import type { MessagePayloadType } from './message-payload-type.js';

/**
 * One reusable message of the collection. It has no destination: the connection that is open puts
 * it, and that is what keeps the same message good for every connection of the workspace.
 */
export type MessageItem = {
    name: string;
    /**
     * Where the message goes inside the connection, when the transport has such a thing. It
     * takes a template —`{{tenant}}.pedidos.creado`— and it is absent until somebody names it.
     */
    channel?: string | undefined;
    /** What gets sent, kept as written: `{{var}}` travels to disk and resolves on the way out. */
    payload: string;
    /**
     * What this message is for, in markdown. It is read and written in the strip of the item and
     * it opens no tab of its own; absent until somebody writes it, because empty is not a text.
     */
    description?: string | undefined;
    payloadType: MessagePayloadType;
    /**
     * The JSON Schema this payload promises to meet, kept as written: the text is the contract.
     * Absent while nobody writes one, and a payload with no schema is checked by nobody.
     */
    schema?: string | undefined;
    /**
     * Whether an emission of this message waits for the server to acknowledge it, and for how
     * long before the wait is given up as unanswered. Absent is the same as not waiting.
     */
    expectAck?: { enabled: boolean; timeoutMs: number } | undefined;
};
