import { useMessages } from '@mandor/i18n';
import { Select, SettingRow } from '@mandor/ui';
import {
    CONNECTION_TRANSPORTS,
    urlForTransport,
    type Connection,
    type ConnectionTransport,
} from '@mandor/schema';
import type { ComponentType } from 'react';

import { useConnectionOverrides } from '../../hooks/useConnectionOverrides.js';
import type { ConnectionWrite } from '../../lib/pending-connection-write.js';
import { TRANSPORT_LABELS } from '../../lib/transport-labels.js';
import { HandshakeTimeoutRow } from './HandshakeTimeoutRow.js';
import { SocketIoSettingsRows } from './SocketIoSettingsRows.js';
import { WebsocketSettingsRows } from './WebsocketSettingsRows.js';

type SettingsConnectionSectionProps = {
    connection: Connection;
    onConnectionChange: (changes: ConnectionWrite) => void;
};

type TransportSettingsRowsProps = SettingsConnectionSectionProps;

/**
 * The rows each transport dials with, keyed by the transport that owns them. A transport that
 * arrives later brings its rows file and its entry here; the section below never asks which
 * one is on screen, and the record refuses to leave a transport without rows.
 */
const TRANSPORT_SETTINGS: Record<ConnectionTransport, ComponentType<TransportSettingsRowsProps>> = {
    socketio: SocketIoSettingsRows,
    websocket: WebsocketSettingsRows,
};

/**
 * What the connection is: the transport it speaks, the rows that transport dials with, and how
 * long either waits for the handshake, over the default of the app.
 * Every change is written the moment it is a decision; nothing waits for a save.
 */
export function SettingsConnectionSection({
    connection,
    onConnectionChange,
}: SettingsConnectionSectionProps) {
    const messages = useMessages('connections');
    const Rows = TRANSPORT_SETTINGS[connection.transport];
    const handshake = useConnectionOverrides('handshake', connection.handshake ?? {}, (next) => {
        onConnectionChange({ handshake: next });
    });

    function changeTransport(transport: ConnectionTransport): void {
        // The url moves with the transport it dials, so a switch never leaves behind a url the
        // new transport could not mean.
        onConnectionChange({ transport, url: urlForTransport(connection.url, transport) });
    }

    return (
        <div className="flex min-w-0 flex-col gap-gap-group" data-part="connection-settings">
            <SettingRow help={messages('transportHelp')} label={messages('transport')}>
                <Select
                    label={messages('transport')}
                    onValueChange={changeTransport}
                    options={CONNECTION_TRANSPORTS.map((entry) => ({
                        label: messages(TRANSPORT_LABELS[entry]),
                        value: entry,
                    }))}
                    value={connection.transport}
                />
            </SettingRow>
            <Rows connection={connection} onConnectionChange={onConnectionChange} />
            <HandshakeTimeoutRow editing={handshake} />
        </div>
    );
}
