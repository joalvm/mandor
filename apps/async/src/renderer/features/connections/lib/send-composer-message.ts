import type { Connection, MessagePayloadType } from '@mandor/schema';
import { fireAndForget } from '@mandor/shell';

import { wirePayload } from '../../../events/wire-payload.js';

import { connectionDefaultsStore } from '../connection-defaults-store.js';

import { frameTemplateOf, resolvedSocketio } from './connection-settings.js';
import { sendMessage } from './send-message.js';

type WorkspaceScope = { workspaceId: string };

type Input = {
    connection: Connection;
    connectionId: string;
    /** The event the composer holds, or free text when it names nothing. */
    eventName: string;
    /** Where the item the composer loaded sits in the collection; null for free text. */
    itemPath: string | null;
    /** The event this connection emits to; the transports without names leave it out. */
    event: string;
    /**
     * Whether the event waits for an answer; absent, or off, is fire and forget. How long it
     * waits is the connection's, which follows the defaults of the app.
     */
    expectAck?: { enabled: boolean; timeoutMs: number } | undefined;
    data: string;
    /** How the composer reads what it holds, so a json draft leaves without its comments. */
    payloadType: MessagePayloadType;
    /** The schema the draft promises to meet, when its event carries one. */
    schema?: string | undefined;
    scope: WorkspaceScope | null;
};

function ackTimeoutOf(connection: Connection): number {
    return resolvedSocketio(connection, connectionDefaultsStore.getState().defaults).ackTimeoutMs;
}

/**
 * Sends what the composer holds through the connection that holds it. Free text comes from
 * nowhere in the collection, and the timeline says so; the event being composed signs the frame
 * with its own name. Answers false when there is nothing to send.
 */
export function sendComposerMessage(input: Input): boolean {
    if (input.data.length === 0 || input.scope === null) {
        return false;
    }

    const frame = frameTemplateOf(input.connection);

    fireAndForget(
        sendMessage({
            connectionId: input.connectionId,
            origin: input.eventName === '' ? null : input.eventName,
            itemPath: input.itemPath,
            template: wirePayload(input.data, input.payloadType),
            workspaceId: input.scope.workspaceId,
            ...(input.schema === undefined ? {} : { schema: input.schema }),
            ...(frame === undefined ? {} : { frame }),
            ...(input.event === '' ? {} : { event: input.event }),
            ...(input.expectAck?.enabled === true
                ? { expectAck: { timeoutMs: ackTimeoutOf(input.connection) } }
                : {}),
        }),
    );

    return true;
}
