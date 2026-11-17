import type { CoreBridge, EnvironmentChanges } from '@mandor/ipc';
import type { Variable } from '@mandor/schema';
import { bridge as rendererBridge, createLatestRead, scopeToOrigin } from '@mandor/shell';
import { createStore, type StoreApi } from 'zustand/vanilla';

import { initialEnvSlice, type EnvSlice, type ScriptVariablePreview } from './env.slice.js';
import { droppedScriptVariables, shownScriptVariables } from './lib/script-variables.js';

type EnvActions = {
    create: (workspaceId: string, name: string) => Promise<void>;
    load: (workspaceId: string) => Promise<void>;
    remove: (workspaceId: string, environmentId: string) => Promise<void>;
    reset: () => void;
    setActive: (workspaceId: string, environmentId: string | null) => Promise<void>;
    /** The whole list of variables of one environment, as a field or a dialog leaves it. */
    setVariables: (
        workspaceId: string,
        environmentId: string,
        variables: readonly Variable[],
    ) => Promise<void>;
    update: (
        workspaceId: string,
        environmentId: string,
        changes: EnvironmentChanges,
    ) => Promise<void>;
    /**
     * The whole list of the globals of the origin. It is on screen at once; a refusal puts the
     * previous list back and keeps the code.
     */
    setGlobals: (variables: readonly Variable[]) => Promise<void>;
    /** The environment that rules a workspace when nobody chose one; null takes it away. */
    setDefault: (workspaceId: string, environmentId: string | null) => Promise<void>;
    /** What scripts set in one environment of a workspace, as the last send told it. */
    showScriptVariables: (
        workspaceId: string,
        environmentId: string,
        variables: readonly ScriptVariablePreview[],
    ) => void;
    /** Forgets what scripts set in every environment of a workspace, once main forgot it. */
    dropScriptVariables: (workspaceId: string) => void;
};

type EnvStore = EnvActions & EnvSlice;
export type EnvStoreApi = StoreApi<EnvStore>;

function actionsFor(
    bridge: CoreBridge,
    set: EnvStoreApi['setState'],
    get: () => EnvStore,
): EnvActions {
    // The list, the active ones and the variables on screen are of the workspace asked for last.
    const ask = createLatestRead();

    const reload = async (workspaceId: string): Promise<void> => {
        const latest = ask();
        const result = await bridge.environment.list({ workspaceId });

        if (!latest()) {
            return;
        }

        if (!result.ok) {
            set({ error: result.error.code });

            return;
        }

        set({ environments: result.value, error: null });
    };

    const setActive = async (workspaceId: string, environmentId: string | null): Promise<void> => {
        const result = await bridge.environment.saveActive({ workspaceId, environmentId });

        if (!result.ok) {
            set({ error: result.error.code });

            return;
        }

        set((state) => ({
            activeEnvironmentIds: changedActive(
                state.activeEnvironmentIds,
                workspaceId,
                environmentId,
            ),
            error: null,
        }));
    };

    const actions: EnvActions = {
        create: async (workspaceId, name) => {
            const result = await bridge.environment.create({ workspaceId, name });

            if (!result.ok) {
                set({ error: result.error.code });

                return;
            }

            await reload(workspaceId);

            if (get().activeEnvironmentIds[workspaceId] === undefined) {
                await setActive(workspaceId, result.value.id);
            }
        },
        load: async (workspaceId) => {
            const latest = ask();
            const [listed, active, preset, globals] = await Promise.all([
                bridge.environment.list({ workspaceId }),
                bridge.environment.loadActive(),
                bridge.environment.loadDefault({ workspaceId }),
                bridge.globals.read({}),
            ]);

            if (!latest()) {
                return;
            }

            if (!listed.ok) {
                set({ error: listed.error.code });

                return;
            }

            if (!active.ok) {
                set({ error: active.error.code });

                return;
            }

            set({
                environments: listed.value,
                activeEnvironmentIds: active.value,
                defaultEnvironmentIds: changedActive(
                    get().defaultEnvironmentIds,
                    workspaceId,
                    preset.ok ? preset.value.environmentId : null,
                ),
                // Globals the origin cannot read resolve nothing: the fields say so by their tone.
                globals: globals.ok ? globals.value.variables : [],
                error: null,
            });
        },
        remove: async (workspaceId, environmentId) => {
            const result = await bridge.environment.delete({ workspaceId, environmentId });

            if (!result.ok) {
                set({ error: result.error.code });

                return;
            }

            await reload(workspaceId);

            if (environmentId === get().activeEnvironmentIds[workspaceId]) {
                await setActive(workspaceId, null);
            }
        },
        reset: () => {
            set({ ...initialEnvSlice(), ...actions }, true);
        },
        showScriptVariables: (workspaceId, environmentId, variables) => {
            set((state) => ({
                scriptVariables: shownScriptVariables(
                    state.scriptVariables,
                    workspaceId,
                    environmentId,
                    variables,
                ),
            }));
        },
        dropScriptVariables: (workspaceId) => {
            set((state) => ({
                scriptVariables: droppedScriptVariables(state.scriptVariables, workspaceId),
            }));
        },
        setActive,
        setVariables: (workspaceId, environmentId, variables) => {
            return actions.update(workspaceId, environmentId, { variables: [...variables] });
        },
        setGlobals: async (variables) => {
            const before = get().globals;
            const shown = [...variables];

            set({ globals: shown });

            const result = await bridge.globals.write({ globals: { variables: shown } });

            // Only the list this write put on screen goes back: one a later write put there since
            // is not this write's to undo.
            if (!result.ok) {
                set(
                    get().globals === shown
                        ? { error: result.error.code, globals: before }
                        : { error: result.error.code },
                );

                return;
            }

            set({ error: null });
        },
        setDefault: async (workspaceId, environmentId) => {
            const result = await bridge.environment.saveDefault({ workspaceId, environmentId });

            if (!result.ok) {
                set({ error: result.error.code });

                return;
            }

            set((state) => ({
                defaultEnvironmentIds: changedActive(
                    state.defaultEnvironmentIds,
                    workspaceId,
                    environmentId,
                ),
                error: null,
            }));
        },
        update: async (workspaceId, environmentId, changes) => {
            const result = await bridge.environment.update({ workspaceId, environmentId, changes });

            if (!result.ok) {
                set({ error: result.error.code });

                return;
            }

            await reload(workspaceId);
        },
    };

    return actions;
}

function changedActive(
    active: Record<string, string>,
    workspaceId: string,
    environmentId: string | null,
): Record<string, string> {
    if (environmentId !== null) {
        return { ...active, [workspaceId]: environmentId };
    }

    return Object.fromEntries(Object.entries(active).filter(([id]) => id !== workspaceId));
}

export function createEnvStore(bridge: CoreBridge): EnvStoreApi {
    return createStore<EnvStore>()((set, get) => {
        const actions = actionsFor(bridge, set, get);

        return { ...initialEnvSlice(), ...actions };
    });
}

export const envStore = scopeToOrigin(createEnvStore(rendererBridge));
