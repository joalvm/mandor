import type { ScopeLevelName, VariableScope } from './variable-scope.js';

/** What the scope answers for one name: the level that provided it, its value and its secrecy. */
export type FoundVariable = {
    level: ScopeLevelName;
    /** The visible name of the collection or folder that gave the value, when it was one. */
    label?: string;
    value: string;
    secret: boolean;
};

/**
 * Walks the levels strongest first and stops at the first one that declares the name. It runs
 * once per placeholder of every text that goes out, so it asks each level for the name instead
 * of listing the level; only what the level holds as its own counts.
 */
export function lookupVariable(scope: VariableScope, name: string): FoundVariable | undefined {
    for (const level of scope) {
        const value = Object.hasOwn(level.values, name) ? level.values[name] : undefined;

        if (value !== undefined) {
            return {
                level: level.name,
                ...(level.label === undefined ? {} : { label: level.label }),
                value,
                secret: level.secret?.includes(name) ?? false,
            };
        }
    }

    return undefined;
}
