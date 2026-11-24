import { ScriptsByEvent } from '@mandor/collections';
import { useMessages } from '@mandor/i18n';
import { CONNECTION_SCRIPT_EVENTS, type Connection, type Environment } from '@mandor/schema';

import { useConnectionScriptContext } from '../../hooks/useConnectionScriptContext.js';
import type { ConnectionWrite } from '../../lib/pending-connection-write.js';

type SettingsScriptsSectionProps = {
    connection: Connection;
    environment: Environment | undefined;
    workspaceId: string;
    onConnectionChange: (changes: ConnectionWrite) => void;
};

/**
 * The scripts of the connection, by the moment of the connection they run at: the moments in a
 * column, the script of the one open beside them with its switch. What a script can never write
 * is said once over them: the auth and the subprotocols stay as typed. Their editors complete
 * with what the connection knows: its environment, its handshake and the last frame it received.
 */
export function SettingsScriptsSection({
    connection,
    environment,
    onConnectionChange,
    workspaceId,
}: SettingsScriptsSectionProps) {
    const labels = useMessages('connections');
    const context = useConnectionScriptContext(connection, environment, workspaceId);

    return (
        <div
            className="flex h-full min-h-0 min-w-0 flex-col gap-gap-control"
            data-part="scripts-settings"
        >
            <p className="py-1 text-xs text-text-secondary">{labels('scriptsHelp')}</p>
            <ScriptsByEvent
                context={context}
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
