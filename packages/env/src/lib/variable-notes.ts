import type { Environment } from '@mandor/schema';
import { traceVariable, type TracedLevel, type VariableScope } from '@mandor/vars';

import { levelName, type LevelWord } from './level-name.js';

/** What a row of a group says about the levels around it, by their names. */
export type VariableNote = {
    name: string;
    kind: 'shadows' | 'shadowedBy';
    levels: string;
};

/**
 * One note per variable of the group that meets another level: the group wins and overrides
 * some, or another level wins over it. A variable nobody else declares says nothing.
 */
/** The rows of a group, the scope they resolve in, the level they are, and the environment. */
export type NotesInput = {
    names: readonly string[];
    scope: VariableScope;
    own: TracedLevel;
    environment: Environment | undefined;
};

export function variableNotes(
    { names, scope, own, environment }: NotesInput,
    word: (key: LevelWord) => string,
): VariableNote[] {
    const nameOf = (level: TracedLevel): string => levelName(level, environment, word);

    return names.flatMap((name): VariableNote[] => {
        const trace = traceVariable(scope, name);

        if (trace === undefined) {
            return [];
        }

        const wins = trace.winner.level === own.level && trace.winner.label === own.label;

        if (wins) {
            return trace.shadowed.length === 0
                ? []
                : [{ name, kind: 'shadows', levels: trace.shadowed.map(nameOf).join(', ') }];
        }

        return [{ name, kind: 'shadowedBy', levels: nameOf(trace.winner) }];
    });
}
