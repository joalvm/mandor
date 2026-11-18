import type { ErrorCode } from '@mandor/ipc';
import type { Environment, FolderChainLevel, Variable } from '@mandor/schema';

/** A value a script set, as the window sees it: cut short and redacted in main. */
export type ScriptVariablePreview = { name: string; preview: string };

export type EnvSlice = {
    activeEnvironmentIds: Record<string, string>;
    environments: Environment[];
    error: ErrorCode | null;
    /**
     * The chain above each place a tab showed, by `chainKey`: what its fields resolve against
     * beside the environment. Read once per place, and again when disk changes under it.
     */
    folderChains: Record<string, FolderChainLevel[]>;
    /** The variables of the workspace file: the level below the environment, never secret. */
    /** The environment each workspace takes when nobody chose one, by workspace id. */
    defaultEnvironmentIds: Record<string, string>;
    /** The globals of the origin, every secret with an empty value: the level below the collection. */
    globals: Variable[];
    /**
     * What scripts set, by workspace and then by environment (`''` for none): the strongest
     * level of the scope. Main holds the values; each push of a send replaces its list here.
     */
    scriptVariables: Record<string, Record<string, ScriptVariablePreview[]>>;
};

export function initialEnvSlice(): EnvSlice {
    return {
        activeEnvironmentIds: {},
        environments: [],
        error: null,
        folderChains: {},
        defaultEnvironmentIds: {},
        globals: [],
        scriptVariables: {},
    };
}
