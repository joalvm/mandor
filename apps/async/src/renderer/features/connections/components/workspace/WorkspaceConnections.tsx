import { fireAndForget, useFailureToast, useRepoChanged } from '@mandor/shell';
import { useEffect, useEffectEvent } from 'react';

import { connectionsStore } from '../../connections-store.js';
import { useWorkspaceScope } from '../../hooks/useWorkspaceScope.js';
import { loadConnections } from '../../lib/load-connections.js';
import { reloadConnections } from '../../lib/reload-connections.js';
import { openRestoredConnections } from '../../lib/open-restored-connections.js';

type WorkspaceConnectionsProps = {
    /**
     * Hands over the reload and returns how to stop asking. Something else in the app can write
     * connections behind the list's back (an import does), and this is how the list hears of
     * it without naming who wrote them. It has to be stable: a new one reads everything again.
     */
    reloadWhen: (reload: () => void) => () => void;
};

/**
 * The connections of the open workspace, read once per workspace for as long as the window
 * lives. It draws nothing.
 *
 * The read does not belong to the section: a folded section unmounts its body, and a body that
 * read on mount wiped every live state on each unfold, blanked the panel of every open
 * connection until the answer came back and dialled the restored ones a second time.
 */
export function WorkspaceConnections({ reloadWhen }: WorkspaceConnectionsProps): null {
    const notifyFailure = useEffectEvent(useFailureToast());
    const scope = useWorkspaceScope();

    useRepoChanged(
        (entity) =>
            entity.area === 'connection' &&
            scope !== null &&
            entity.workspaceId === scope.workspaceId,
        () => {
            if (scope !== null) {
                fireAndForget(reloadConnections(scope));
            }
        },
    );

    useEffect(() => {
        let active = true;
        let stopDialling: (() => void) | undefined;

        // Reading again keeps whatever is live exactly as it is.
        const stopHearing = reloadWhen(() => {
            if (scope !== null) {
                fireAndForget(loadConnections(scope));
            }
        });

        connectionsStore.getState().reset();

        if (scope !== null) {
            fireAndForget(
                loadConnections(scope).then((result) => {
                    if (!active) {
                        return;
                    }

                    if (result.ok) {
                        stopDialling = openRestoredConnections(result.value);

                        return;
                    }

                    notifyFailure(result.error.code);
                }),
            );
        }

        return () => {
            active = false;
            stopHearing();
            stopDialling?.();
        };
    }, [reloadWhen, scope]);

    return null;
}
