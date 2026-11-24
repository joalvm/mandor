import type { Environment } from '@mandor/schema';
import { readEnvironment } from '@mandor/store-fs';

import { environmentPath, saveEnvironment } from '../environment/save-environment.js';
import { activeRepo, type ActiveRepo } from '../origin/active-repo.js';
import { pushChanges } from '../origin/origin-runtime.js';
import { entitiesOfPaths } from '../repo/entities-of-paths.js';
import type { ScriptVariableSet, ScriptVariablesPlace } from './script-variables.js';

/** Where the values a script set go when the environment of the run declares their names. */
export type ScriptEnvironment = {
    /**
     * Writes into the environment of the place every value whose name it declares, and hands back
     * the sets it did not take: those stay in the memory of main, as before.
     */
    keep(
        place: ScriptVariablesPlace,
        sets: readonly ScriptVariableSet[],
    ): Promise<ScriptVariableSet[]>;
};

type Target = { repo: ActiveRepo; environment: Environment; place: ScriptVariablesPlace };

/** The environment a run sets into: the one of its place, in the origin open right now. */
async function targetOf(place: ScriptVariablesPlace): Promise<Target | null> {
    const repo = activeRepo();

    if (place.environmentId === null || !repo.ok || repo.value.id !== place.origin) {
        return null;
    }

    // A file that is gone or unreadable declares nothing: the values stay in memory.
    const environment = await readEnvironment(
        repo.value.root,
        place.workspaceId,
        place.environmentId,
    ).catch(() => null);

    return environment === null ? null : { repo: repo.value, environment, place };
}

/** The variables of the environment with the values the run set, the last one of a name winning. */
function variablesWith(environment: Environment, taken: readonly ScriptVariableSet[]) {
    const last = new Map(taken.map(({ name, value }) => [name, value]));

    return environment.variables.map((variable) => {
        const value = last.get(variable.name);

        return value === undefined ? variable : { ...variable, value };
    });
}

async function write(userDataDir: string, target: Target, taken: readonly ScriptVariableSet[]) {
    const { repo, environment, place } = target;
    const environmentId = environment.id;

    await saveEnvironment({
        userDataDir,
        repo,
        workspaceId: place.workspaceId,
        environmentId,
        changes: { variables: variablesWith(environment, taken) },
    });
    pushChanges(entitiesOfPaths([environmentPath(repo.root, place.workspaceId, environmentId)]));
}

/**
 * What `mandor.variables.set` does to a variable the environment of the run declares: its value
 * changes in the environment and stays, the way Postman does it. A secret one goes to the keychain
 * of the system and never into the file, so it never reaches the remote. A name the environment
 * does not declare is the memory's, and is gone when the app closes.
 */
export function createScriptEnvironment(userDataDir: string): ScriptEnvironment {
    return {
        async keep(place, sets) {
            const target = sets.length === 0 ? null : await targetOf(place);

            if (target === null) {
                return [...sets];
            }

            const declared = new Set(target.environment.variables.map(({ name }) => name));
            const taken = sets.filter(({ name }) => declared.has(name));

            if (taken.length > 0) {
                await write(userDataDir, target, taken);
            }

            return sets.filter(({ name }) => !declared.has(name));
        },
    };
}
