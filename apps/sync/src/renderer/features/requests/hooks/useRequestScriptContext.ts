import { useDeclaredInScripts } from '@mandor/collections';
import { ItemPlaceContext, listedVariables, useFolderChain, useVariableScope } from '@mandor/env';
import type { RequestItem } from '@mandor/schema';
import type { ScriptContext } from '@mandor/script';
import { useContext, useMemo } from 'react';
import { useStore } from 'zustand';

import { answerOf, requestScriptContextOf } from '../lib/request-script-context.js';
import { requestPartsOf } from '../lib/request-parts.js';
import { requestsStore } from '../requests-store.js';
import { IDLE_SEND } from '../responses.slice.js';
import { useEnvironmentOfWorkspace } from './useRequestEnvironment.js';

/**
 * What the editors of the scripts of a request know: the variables its send resolves, secrets
 * masked; what its scripts and the ones of its chain declare; the headers it sends; and the
 * example written down, or the last answer, as a sample. One object while none of it changes.
 */
export function useRequestScriptContext(resource: string, request: RequestItem): ScriptContext {
    const parentPath = useContext(ItemPlaceContext);
    const workspaceId = requestPartsOf(resource)?.workspaceId;
    const scope = useVariableScope(useEnvironmentOfWorkspace(workspaceId));
    const chain = useFolderChain(workspaceId ?? null, parentPath);
    const entry = useStore(requestsStore, (state) => state.sends[resource] ?? IDLE_SEND);
    const declared = useDeclaredInScripts([
        request.scripts,
        ...chain.map(({ settings }) => settings.scripts),
    ]);
    const response = answerOf(entry);
    const { examples, headers } = request;

    return useMemo(
        () =>
            requestScriptContextOf({
                example: examples[0],
                headers,
                response,
                variables: listedVariables(scope, declared),
            }),
        [declared, examples, headers, response, scope],
    );
}
