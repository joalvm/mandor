import { useMessages } from '@mandor/i18n';
import { Input, Select, SettingRow } from '@mandor/ui';
import {
    SOCKETIO_ENGINE_TRANSPORTS,
    SOCKETIO_VERSIONS,
    type Connection,
    type SocketIoEngineTransport,
    type SocketIoVersion,
} from '@mandor/schema';
import { useState } from 'react';

import { useConnectionOverrides } from '../../hooks/useConnectionOverrides.js';
import { resolvedSocketio } from '../../lib/connection-settings.js';
import type { ConnectionWrite } from '../../lib/pending-connection-write.js';
import { enginePathWritable, namespaceWritable } from '../../lib/typed-socket-options.js';
import { AckTimeoutRow } from './AckTimeoutRow.js';
import { MessageSizeRow } from './MessageSizeRow.js';

type SocketIoSettingsRowsProps = {
    connection: Connection;
    onConnectionChange: (changes: ConnectionWrite) => void;
};

const ENGINE_TRANSPORT_LABELS: Record<SocketIoEngineTransport, string> = {
    'polling-only': 'engineTransportPollingOnly',
    'polling-then-upgrade': 'engineTransportPollingThenUpgrade',
    'websocket-only': 'engineTransportWebsocketOnly',
};

const VERSION_LABELS: Record<SocketIoVersion, string> = {
    v2: 'socketioVersionV2',
    v4: 'socketioVersionV4',
};

/**
 * The rows a Socket.IO connection dials with: the protocol its server speaks, the namespace it
 * joins, where the server mounts Engine.IO, how the bytes travel underneath, and how long an
 * emit waits for its ack and how big a frame it takes — those two over the defaults of the app.
 * Every change writes the socketio group as the file has it, so the entries it does not touch
 * stay as they were.
 */
export function SocketIoSettingsRows({
    connection,
    onConnectionChange,
}: SocketIoSettingsRowsProps) {
    const messages = useMessages('connections');
    const socketio = resolvedSocketio(connection);
    /** The path fields as they are being typed; null keeps the saved one on screen. */
    const [drafts, setDrafts] = useState<{ enginePath: string | null; namespace: string | null }>({
        enginePath: null,
        namespace: null,
    });

    // The group is the overrides whole: the paths and the auth ride through untouched.
    const appDefaulted = useConnectionOverrides('socketio', connection.socketio ?? {}, (next) => {
        onConnectionChange({ socketio: next });
    });

    function write(part: Partial<Connection['socketio']>): void {
        onConnectionChange({ socketio: { ...connection.socketio, ...part } });
    }

    return (
        <>
            <SettingRow help={messages('socketioVersionHelp')} label={messages('socketioVersion')}>
                <Select
                    label={messages('socketioVersion')}
                    onValueChange={(version) => {
                        write({ version });
                    }}
                    options={SOCKETIO_VERSIONS.map((entry) => ({
                        label: messages(VERSION_LABELS[entry]),
                        value: entry,
                    }))}
                    value={socketio.version}
                />
            </SettingRow>
            <SettingRow help={messages('namespaceHelp')} label={messages('namespace')}>
                <Input
                    className="w-full font-mono"
                    invalid={drafts.namespace !== null && !namespaceWritable(drafts.namespace)}
                    label={messages('namespace')}
                    onValueChange={(raw) => {
                        setDrafts((draft) => ({ ...draft, namespace: raw }));

                        if (namespaceWritable(raw)) {
                            write({ namespace: raw });
                        }
                    }}
                    value={drafts.namespace ?? socketio.namespace}
                />
            </SettingRow>
            <SettingRow help={messages('enginePathHelp')} label={messages('enginePath')}>
                <Input
                    className="w-full font-mono"
                    invalid={drafts.enginePath !== null && !enginePathWritable(drafts.enginePath)}
                    label={messages('enginePath')}
                    onValueChange={(raw) => {
                        setDrafts((draft) => ({ ...draft, enginePath: raw }));

                        if (enginePathWritable(raw)) {
                            write({ enginePath: raw });
                        }
                    }}
                    value={drafts.enginePath ?? socketio.enginePath}
                />
            </SettingRow>
            <SettingRow help={messages('engineTransportHelp')} label={messages('engineTransport')}>
                <Select
                    label={messages('engineTransport')}
                    onValueChange={(engineTransport) => {
                        write({ engineTransport });
                    }}
                    options={SOCKETIO_ENGINE_TRANSPORTS.map((entry) => ({
                        label: messages(ENGINE_TRANSPORT_LABELS[entry]),
                        value: entry,
                    }))}
                    value={socketio.engineTransport}
                />
            </SettingRow>
            <AckTimeoutRow editing={appDefaulted} />
            <MessageSizeRow editing={appDefaulted} />
        </>
    );
}
