import { useMessages } from '@mandor/i18n';
import { RowList } from '@mandor/ui';
import { useStore } from 'zustand';

import { connectionsStore } from '../../connections-store.js';
import { useWorkspaceScope } from '../../hooks/useWorkspaceScope.js';
import { selectConnections } from '../../selectors.js';
import { ConnectionRow } from './ConnectionRow.js';

/**
 * The collection of the workspace. It holds what can be opened and nothing else: no repository,
 * no workspace, no settings. Those are tabs, because the centre panel is where things are
 * managed and the lateral is where they are found. Creating one is an action of the section
 * header, so the body of the list carries no form, and with nothing to list it draws nothing.
 *
 * It reads nothing either: folding the section unmounts this body, so the read lives with the
 * window in `WorkspaceConnections`.
 */
export function ConnectionsSidebar() {
    const messages = useMessages('connections');
    const scope = useWorkspaceScope();
    const connections = useStore(connectionsStore, selectConnections);
    const activeConnectionId = useStore(connectionsStore, (state) => state.activeConnectionId);

    if (scope === null || connections.length === 0) {
        return null;
    }

    return (
        <RowList className="flex flex-col" data-part="collections" label={messages('heading')}>
            {connections.map((connection) => (
                <ConnectionRow
                    connection={connection}
                    key={connection.id}
                    scope={scope}
                    selected={connection.id === activeConnectionId}
                />
            ))}
        </RowList>
    );
}
