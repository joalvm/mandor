import { KeyValueTable } from '@mandor/env';
import { useMessages } from '@mandor/i18n';
import type { Connection, Environment, Variable } from '@mandor/schema';

import { useRecordLines } from '../../hooks/useRecordLines.js';
import { authRecordsOf } from '../../lib/entry-lines.js';
import type { ConnectionWrite } from '../../lib/pending-connection-write.js';

type SettingsAuthSectionProps = {
    connection: Connection;
    environment: Environment | undefined;
    onConnectionChange: (changes: ConnectionWrite) => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
};

/**
 * The auth entries the Socket.IO handshake carries, each one on or off. The entries travel in
 * the connection's socketio group, so the rest of that group stays as it was.
 */
export function SettingsAuthSection({
    connection,
    environment,
    onConnectionChange,
    onVariablesChange,
}: SettingsAuthSectionProps) {
    const messages = useMessages('connections');
    const table = useRecordLines(authRecordsOf(connection), (records) => {
        onConnectionChange({
            socketio: { ...connection.socketio, auth: records.on, disabledAuth: records.off },
        });
    });

    return (
        <div
            className="flex min-w-0 flex-col items-stretch gap-gap-control"
            data-part="auth-settings"
        >
            <p className="py-1 text-xs text-text-secondary">
                {messages('authHelp', { variables: '{{variables}}' })}
            </p>
            <KeyValueTable
                {...table}
                environment={environment}
                onVariablesChange={onVariablesChange}
                title={messages('sectionConnectionAuth')}
                typed={false}
            />
        </div>
    );
}
