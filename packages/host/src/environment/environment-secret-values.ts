import type { Environment, Variable } from '@mandor/schema';

import { environmentSecretKey, type SecretPlace } from '../secret/environment-secret-key.js';
import type { ReadSecretValue } from '../secret/read-secret-value.js';

/**
 * The values of the secret variables of an environment, read one by one from the store of the
 * system. The file of the environment holds none of them: it declares the name and keeps the
 * value empty, so this is the only place a resolution can get one from.
 *
 * A name this machine keeps no value for is left out. That is the declared-and-empty state,
 * and it is normal: the environment travels in git and the values do not travel with it.
 */
export function environmentSecretValues(
    read: ReadSecretValue,
    place: SecretPlace,
    environment: Pick<Environment, 'variables'>,
): Promise<Record<string, string>> {
    return secretValuesAt(read, (name) => environmentSecretKey(place, name), environment.variables);
}

/** The same reading for any list of variables whose secrets live under `keyOf`: the globals too. */
export async function secretValuesAt(
    read: ReadSecretValue,
    keyOf: (name: string) => string,
    variables: readonly Variable[],
): Promise<Record<string, string>> {
    const kept: [string, string][] = [];

    for (const variable of variables) {
        const value = await valueOf(read, keyOf, variable);

        if (value !== null) {
            kept.push([variable.name, value]);
        }
    }

    return Object.fromEntries(kept);
}

async function valueOf(
    read: ReadSecretValue,
    keyOf: (name: string) => string,
    variable: Variable,
): Promise<string | null> {
    if (!variable.enabled || !variable.secret) {
        return null;
    }

    const value = await read(keyOf(variable.name)).catch(() => null);

    return value === null || value === '' ? null : value;
}
