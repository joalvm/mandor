import type { EnvSlice, ScriptVariablePreview } from '../env.slice.js';

type ScriptVariables = EnvSlice['scriptVariables'];

/** What scripts set in one environment of a workspace, replaced by what the last send told. */
export function shownScriptVariables(
    all: ScriptVariables,
    workspaceId: string,
    environmentId: string,
    variables: readonly ScriptVariablePreview[],
): ScriptVariables {
    return { ...all, [workspaceId]: { ...all[workspaceId], [environmentId]: [...variables] } };
}

/** Every workspace but one: what scripts set there is forgotten in all its environments. */
export function droppedScriptVariables(all: ScriptVariables, workspaceId: string): ScriptVariables {
    return Object.fromEntries(Object.entries(all).filter(([id]) => id !== workspaceId));
}
