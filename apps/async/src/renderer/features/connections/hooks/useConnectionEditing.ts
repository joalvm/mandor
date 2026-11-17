import { envStore } from '@mandor/env';
import {
    type Connection,
    effectiveEnvironment,
    type Environment,
    type Variable,
} from '@mandor/schema';
import { fireAndForget } from '@mandor/shell';
import { useStore } from 'zustand';

import { scheduleConnectionWrite, type ConnectionWrite } from '../lib/pending-connection-write.js';
import { updateConnectionEnvironment } from '../lib/update-connection-environment.js';
import type { WorkspaceScope } from '../lib/workspace-scope.js';

type ConnectionEditingOptions = {
    connection: Connection | undefined;
    /** The environments the workspace holds: one of them carries the variables to write. */
    environments: readonly Environment[];
    scope: WorkspaceScope | null;
};

/**
 * Every edit of the connection saves itself: the url, the headers and the description land on
 * disk once the typing stops, and a change that carries nothing — opening the picker, or the
 * focus leaving a field untouched — writes nothing at all. The variables go to the environment
 * the connection resolves against, which saves itself the same way. The panel hands the edits
 * down as props.
 */
export function useConnectionEditing({
    connection,
    environments,
    scope,
}: ConnectionEditingOptions) {
    const defaults = useStore(envStore, (state) => state.defaultEnvironmentIds);

    function edit(change: ConnectionWrite): void {
        if (connection === undefined || scope === null) {
            return;
        }

        scheduleConnectionWrite(scope, connection, change);
    }

    function onDescriptionChange(description: string): void {
        if ((connection?.description ?? '') === description) {
            return;
        }

        edit({ description });
    }

    /** The environment writes at once, not after a pause: a live socket reopens against it. */
    function onEnvironmentChange(environmentId: string): void {
        if (
            connection === undefined ||
            scope === null ||
            connection.environmentId === environmentId
        ) {
            return;
        }

        fireAndForget(updateConnectionEnvironment(scope, connection, environmentId));
    }

    function onUrlChange(url: string): void {
        if (connection === undefined || connection.url === url) {
            return;
        }

        edit({ url });
    }

    function onVariablesChange(variables: readonly Variable[]): void {
        const environment = rulingOf(connection);

        if (scope !== null && connection !== undefined && environment !== undefined) {
            fireAndForget(
                envStore.getState().setVariables(scope.workspaceId, environment.id, variables),
            );
        }
    }

    /**
     * The environment the connection resolves with: its own, or — with none of its own — the
     * default of the workspace, as main does when it opens and sends.
     */
    function rulingOf(of: Connection | undefined): Environment | undefined {
        if (of === undefined) {
            return undefined;
        }

        const fallback = scope === null ? null : (defaults[scope.workspaceId] ?? null);
        const id = effectiveEnvironment(of.environmentId, {
            defaultEnvironment: fallback ?? undefined,
        });

        return environments.find((entry) => entry.id === id);
    }

    const environment = rulingOf(connection);

    return {
        environment,
        onDescriptionChange,
        onEnvironmentChange,
        onUrlChange,
        onVariablesChange,
    };
}
