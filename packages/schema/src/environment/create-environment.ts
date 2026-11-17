import type { Environment } from './environment.js';
import { parseEnvironment } from './parse-environment.js';
import type { Variable } from './variable.js';

export type CreateEnvironmentInput = {
    /** The opaque id the caller minted; it names the file and never follows the name. */
    id: string;
    name: string;
    variables?: readonly Variable[];
};

/** Creates an environment; it starts empty unless the caller brings variables. */
export function createEnvironment({ id, name, variables }: CreateEnvironmentInput): Environment {
    const environment = {
        id,
        name,
        variables: [...(variables ?? [])],
    };

    return parseEnvironment(environment);
}
