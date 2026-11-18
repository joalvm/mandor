import { type FoundVariable, lookupVariable } from './lookup-variable.js';
import type { ScopeLevelName, VariableScope } from './variable-scope.js';

/** A level of the scope as a person reads it: its kind, and its name when it has one. */
export type TracedLevel = { level: ScopeLevelName; label?: string };

/** Where a name comes from: the level that wins with its value, and the ones it overrides. */
export type VariableTrace = {
    winner: FoundVariable;
    shadowed: TracedLevel[];
};

/**
 * Explains one name against a scope: which level gives its value and which others declare it
 * too and lose. The window shows it as «defined in Pagos · overrides Prod». Resolution keeps
 * using `lookupVariable`, which stops at the first level.
 */
export function traceVariable(scope: VariableScope, name: string): VariableTrace | undefined {
    const winner = lookupVariable(scope, name);

    if (winner === undefined) {
        return undefined;
    }

    const holders = scope.filter((level) => Object.hasOwn(level.values, name));

    return { winner, shadowed: holders.slice(1).map(traced) };
}

function traced(level: VariableScope[number]): TracedLevel {
    return level.label === undefined
        ? { level: level.name }
        : { level: level.name, label: level.label };
}
