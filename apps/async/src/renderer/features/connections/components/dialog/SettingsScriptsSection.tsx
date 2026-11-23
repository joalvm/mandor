import { ScriptsByEvent } from '@mandor/collections';
import { useMessages } from '@mandor/i18n';
import { CONNECTION_SCRIPT_EVENTS, type Connection } from '@mandor/schema';

import type { ConnectionWrite } from '../../lib/pending-connection-write.js';

type SettingsScriptsSectionProps = {
    connection: Connection;
    workspaceId: string;
    onConnectionChange: (changes: ConnectionWrite) => void;
};

/**
 * The scripts of the connection, by the moment of the connection they run at: the moments in a
 * column, the script of the one open beside them with its switch. What a script can never write
 * is said once over them: the auth and the subprotocols stay as typed.
 */
export function SettingsScriptsSection({
    connection,
    onConnectionChange,
    workspaceId,
}: SettingsScriptsSectionProps) {
    const labels = useMessages('connections');

    return (
        <div
            className="flex h-full min-h-0 min-w-0 flex-col gap-gap-control"
            data-part="scripts-settings"
        >
            <p className="py-1 text-xs text-text-secondary">{labels('scriptsHelp')}</p>
            <ScriptsByEvent
                events={CONNECTION_SCRIPT_EVENTS}
                onChange={(scripts) => {
                    onConnectionChange({ scripts });
                }}
                place={{ level: 'connection', workspaceId }}
                resource={`connection:${workspaceId}/${connection.id}`}
                scripts={connection.scripts}
            />
        </div>
    );
}
