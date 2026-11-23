import type { ScopeLevelName, VariableScope } from '@mandor/vars';

import { maskOf } from './secret-mask.js';

/** Where a listed variable comes from, as somebody reading a script tells them apart. */
export type ListedVariableOrigin = 'collection' | 'environment' | 'script';

/** One variable a place resolves, with its value as it may be shown: a secret only masked. */
export type ListedVariable = {
    name: string;
    origin: ListedVariableOrigin;
    secret: boolean;
    value: string;
};

/**
 * Where each level of a scope is listed: the folders count as their collection, the globals as
 * the environment they stand beside. The computed ones are no variable anybody declared.
 */
const ORIGIN_OF: Readonly<Record<ScopeLevelName, ListedVariableOrigin | undefined>> = {
    collection: 'collection',
    dynamic: undefined,
    environment: 'environment',
    folder: 'collection',
    globals: 'environment',
    script: 'script',
};

/**
 * The variables a scope resolves, once each, from the level that wins: what a script would read
 * by that name. A secret is listed by its name with its value masked, never in clear. After them
 * come the names the scripts of the place declare and the scope does not hold yet: a script
 * writes them before another reads them, so they have no value to show.
 */
export function listedVariables(
    scope: VariableScope,
    declared: readonly string[],
): ListedVariable[] {
    const byName = new Map<string, ListedVariable>();

    scope.forEach((level) => {
        const origin = ORIGIN_OF[level.name];

        if (origin === undefined) {
            return;
        }

        Object.entries(level.values).forEach(([name, value]) => {
            const secret = level.secret?.includes(name) ?? false;

            byName.set(
                name,
                byName.get(name) ?? { name, origin, secret, value: secret ? maskOf(value) : value },
            );
        });
    });
    declared.forEach((name) => {
        byName.set(name, byName.get(name) ?? { name, origin: 'script', secret: false, value: '' });
    });

    return [...byName.values()];
}
