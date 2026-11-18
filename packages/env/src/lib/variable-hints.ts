import type { SuggestOption } from '@mandor/ui';
import { traceVariable, type VariableScope } from '@mandor/vars';

/**
 * One option per name the field can still suggest. The value joins as a hint when it may: a
 * secret never shows it, and an empty value has nothing to show. The value is the one that wins
 * in the scope, which is the one that goes out.
 */
export function variableHints(
    scope: VariableScope,
    names: readonly string[],
): readonly SuggestOption[] {
    return names.map((name) => {
        const winner = traceVariable(scope, name)?.winner;

        return {
            name,
            ...(winner === undefined || winner.secret || winner.value === ''
                ? {}
                : { hint: winner.value }),
        };
    });
}
