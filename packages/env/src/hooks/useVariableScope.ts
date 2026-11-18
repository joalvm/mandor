import type { Environment } from '@mandor/schema';
import { useShellStore } from '@mandor/shell';
import type { VariableScope } from '@mandor/vars';
import { useContext, useMemo } from 'react';

import { ItemPlaceContext } from '../lib/item-place.js';
import { windowScope } from '../lib/window-scope.js';
import { useFolderChain } from './useFolderChain.js';
import { useStore } from 'zustand';

import { envStore } from '../env-store.js';
import type { ScriptVariablePreview } from '../env.slice.js';

const NO_SCRIPT_VARIABLES: ScriptVariablePreview[] = [];

/**
 * What a field resolves against: the environment in force, the workspace, and — when the field
 * sits under an item — the chain of that item's folder — and what scripts set in that environment
 * of the workspace in front. It is the scope main will send with, so what is painted is what goes
 * out.
 */
export function useVariableScope(environment: Environment | undefined): VariableScope {
    const parentPath = useContext(ItemPlaceContext);
    // A field under no item never reads a chain, so it does not follow the workspace either.
    const workspaceId = useShellStore((state) =>
        parentPath === null ? null : state.activeWorkspaceId,
    );
    const chain = useFolderChain(workspaceId, parentPath);
    const globals = useStore(envStore, (state) => state.globals);
    const scripted = useShellStore((state) => state.activeWorkspaceId);
    const scriptVariables = useStore(
        envStore,
        (state) =>
            state.scriptVariables[scripted ?? '']?.[environment?.id ?? ''] ?? NO_SCRIPT_VARIABLES,
    );

    return useMemo(
        () => windowScope(environment, globals, chain, scriptVariables),
        [environment, globals, chain, scriptVariables],
    );
}
