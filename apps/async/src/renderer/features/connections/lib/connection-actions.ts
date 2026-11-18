import type { Connection, MessagePayloadType } from '@mandor/schema';
import { fireAndForget } from '@mandor/shell';
import type { ToastRequest } from '@mandor/ui';
import type { TFunction } from 'i18next';

import type { ComposerEvent } from '../../../events/composer-events-store.js';
import { itemPathOfResource } from '../../../events/item-path-of-resource.js';
import { openSocket } from './open-socket.js';
import { sendComposerMessage } from './send-composer-message.js';
import { requestConnectionToggle } from './toggle-connection.js';
import type { WorkspaceScope } from './workspace-scope.js';

type ConnectionActionsInput = {
    /** The event the composer holds, whose ack the send carries; free text asks for none. */
    composerEvent: ComposerEvent | undefined;
    /** The name the collection gives the event today, as the timeline signs the frame with it. */
    eventName: string;
    connection: Connection;
    connectionId: string;
    /** Whether the socket is live: a live connection toggles down, a dead one tries up. */
    live: boolean;
    notify: (request: ToastRequest) => void;
    payloadType: MessagePayloadType;
    scope: WorkspaceScope | null;
    translate: TFunction<'connections'>;
};

/**
 * The actions the panel offers over its connection: the switch that connects or disconnects it,
 * the send of what the composer holds, and the open past a broken script. The requests are built here and nowhere else, so
 * what a send carries — the event it goes to, the ack it waits for — is decided once.
 */
export function connectionActions(input: ConnectionActionsInput): {
    onConnectWithoutScripts: () => void;
    onSend: (data: string, eventName: string) => void;
    onToggle: () => void;
} {
    /** The way out of a script that kept the socket shut: the same open, past the scripts. */
    function onConnectWithoutScripts(): void {
        if (input.scope === null) {
            return;
        }

        fireAndForget(openSocket(input.connection, input.scope, { skipScripts: true }));
    }

    function onToggle(): void {
        requestConnectionToggle({
            connection: input.connection,
            live: input.live,
            notify: input.notify,
            scope: input.scope,
            translate: input.translate,
        });
    }

    function onSend(data: string, event: string): void {
        sendComposerMessage({
            connection: input.connection,
            connectionId: input.connectionId,
            data,
            eventName: input.composerEvent === undefined ? '' : input.eventName,
            itemPath: itemPathOfResource(input.composerEvent?.eventResource ?? ''),
            event,
            expectAck: input.composerEvent?.expectAck,
            payloadType: input.payloadType,
            schema:
                input.payloadType === 'json' && (input.composerEvent?.schema ?? '').trim() !== ''
                    ? input.composerEvent?.schema
                    : undefined,
            scope: input.scope,
        });
    }

    return { onConnectWithoutScripts, onSend, onToggle };
}
