import { useDeclaredInScripts } from '@mandor/collections';
import { listedVariables, useFolderChain, useVariableScope } from '@mandor/env';
import type { ScriptContext } from '@mandor/script';
import { useMemo } from 'react';

import { requestScriptContextOf } from '../lib/request-script-context.js';
import { useEnvironmentOfWorkspace } from './useRequestEnvironment.js';

/**
 * What the editors of the scripts of a collection or a folder know: the variables a request under
 * it resolves and what its chain of scripts declares. Read under the place of the group, so the
 * scope holds its own variables.
 */
export function useFolderScriptContext(workspaceId: string, path: string): ScriptContext {
    const scope = useVariableScope(useEnvironmentOfWorkspace(workspaceId));
    const chain = useFolderChain(workspaceId, path);
    const declared = useDeclaredInScripts(chain.map(({ settings }) => settings.scripts));

    return useMemo(
        () => requestScriptContextOf({ variables: listedVariables(scope, declared) }),
        [declared, scope],
    );
}
