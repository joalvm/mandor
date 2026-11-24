import { useDeclaredInScripts } from '@mandor/collections';
import { listedVariables, useVariableScope } from '@mandor/env';
import type { Connection, Environment } from '@mandor/schema';
import type { ScriptContext } from '@mandor/script';
import { originName } from '@mandor/shell';
import { useMemo } from 'react';
import { useStore } from 'zustand';

import { activityStore } from '../../../activity/activity-store.js';
import { connectionResource } from '../lib/connection-resource.js';
import { connectionScriptContextOf, lastReceivedText } from '../lib/connection-script-context.js';

/**
 * What the editors of the scripts of a connection know: the variables of its environment, secrets
 * masked; what its scripts declare; the headers of its handshake; and the last frame it received,
 * as a sample. The store is read down to that text, so a frame sent or a line of the console does
 * not rebuild what the editors know.
 */
export function useConnectionScriptContext(
    connection: Connection,
    environment: Environment | undefined,
    workspaceId: string,
): ScriptContext {
    const resource = connectionResource(originName(), workspaceId, connection.id);
    const received = useStore(activityStore, (state) =>
        lastReceivedText(state.entries[resource] ?? []),
    );
    const scope = useVariableScope(environment);
    const declared = useDeclaredInScripts([connection.scripts]);
    const { headers } = connection;

    return useMemo(
        () =>
            connectionScriptContextOf({
                headers,
                received,
                variables: listedVariables(scope, declared),
            }),
        [declared, headers, received, scope],
    );
}
