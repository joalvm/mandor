import type { Environment } from './environment.js';
import type { Variable } from './variable.js';

/** What a spread answers: the environments with what they lacked, and the new one, `Base`. */
export type SpreadVariables = {
    /** Every environment given, in its order, each with the names it did not have active. */
    environments: Environment[];
    /** The ids of the environments the spread changed: the ones a write has to touch. */
    changed: string[];
    /** The environment born with the variables themselves, which a workspace takes as default. */
    base: Environment;
};

/** The environment that receives the variables: an id the caller drew and a name nobody uses. */
export type BaseOf = { id: string; name: string };

/**
 * Spreads variables that used to sit below every environment into the environments, so what
 * each one resolves stays the same once that level is gone. An environment that has the name
 * active keeps its own value — it already won; one that has it switched off gets it switched on
 * with the value that used to resolve; one that lacks it gets it at the end. A variable switched
 * off resolved nothing, and is left out of the spread. `Base` is born with all of them, as they
 * were. Pure: migration and import call it the same way.
 */
export function spreadIntoEnvironments(
    variables: readonly Variable[],
    environments: readonly Environment[],
    base: BaseOf,
): SpreadVariables {
    const active = variables.filter((variable) => variable.enabled);
    const spread = environments.map((environment) => withVariables(environment, active));
    const changed = spread
        .filter((environment, index) => environment !== environments[index])
        .map((environment) => environment.id);

    return {
        environments: spread,
        changed,
        base: { id: base.id, name: base.name, variables: [...variables] },
    };
}

function withVariables(environment: Environment, active: readonly Variable[]): Environment {
    const missing = active.filter((variable) => !hasActive(environment, variable.name));

    if (missing.length === 0) {
        return environment;
    }

    const switchedOff = new Map(missing.map((variable) => [variable.name, variable]));
    const kept = environment.variables.map(
        (own) => switchedOn(own, switchedOff.get(own.name)) ?? own,
    );
    const present = new Set(environment.variables.map((variable) => variable.name));
    const added = missing.filter((variable) => !present.has(variable.name));

    return { ...environment, variables: [...kept, ...added] };
}

function hasActive(environment: Environment, name: string): boolean {
    return environment.variables.some((variable) => variable.name === name && variable.enabled);
}

/**
 * A declaration switched off takes the value that used to resolve, and comes on. It comes on
 * plain: the value it takes was in a file that goes to git, and a secret mark would leave it
 * blank on disk with nothing in the keychain.
 */
function switchedOn(own: Variable, from: Variable | undefined): Variable | undefined {
    if (from === undefined) {
        return undefined;
    }

    return { ...own, enabled: true, secret: false, value: from.value };
}
