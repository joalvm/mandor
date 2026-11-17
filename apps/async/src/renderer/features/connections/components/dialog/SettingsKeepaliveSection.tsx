import type { Connection } from '@mandor/schema';

import { useConnectionOverrides } from '../../hooks/useConnectionOverrides.js';
import type { ConnectionWrite } from '../../lib/pending-connection-write.js';
import { KeepaliveRows } from './KeepaliveRows.js';

type SettingsKeepaliveSectionProps = {
    connection: Connection;
    onConnectionChange: (changes: ConnectionWrite) => void;
};

/** The beat this connection proves its liveness by, over the one of the app. */
export function SettingsKeepaliveSection({
    connection,
    onConnectionChange,
}: SettingsKeepaliveSectionProps) {
    const editing = useConnectionOverrides('keepalive', connection.keepalive ?? {}, (keepalive) => {
        onConnectionChange({ keepalive });
    });

    return (
        <div className="flex min-w-0 flex-col gap-gap-group" data-part="keepalive-settings">
            <KeepaliveRows editing={editing} />
        </div>
    );
}
