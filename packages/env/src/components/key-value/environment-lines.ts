import type { Variable } from '@mandor/schema';

import { nextLineId } from '../../lib/entry-line.js';

import type { KeyValueLine } from './key-value-line.js';

/**
 * The lines of the variables on screen. A variable of the schema carries no identity of its
 * own, so the ids live beside the list: the ones the table handed back, in order, each one
 * travelling with the line it was given to. A list that grew from outside — another window
 * wrote the environment — takes new ones at the tail, picked the way the table picks them, so
 * the same list and the same ids always spell the same lines.
 */
export function linesOfVariables(
    variables: readonly Variable[],
    ids: readonly string[],
): KeyValueLine[] {
    const aligned = alignedIds(ids, variables.length);

    return variables.map((variable, at) => ({
        disabled: !variable.enabled,
        id: aligned[at] ?? String(at),
        name: variable.name,
        secret: variable.secret,
        value: variable.value,
    }));
}

/** The variable a line spells: the mark of secret and the switch ride home with it. */
function variableOfLine(line: KeyValueLine): Variable {
    return {
        enabled: !line.disabled,
        name: line.name,
        secret: line.secret === true,
        value: line.value,
    };
}

export function variablesOfLines(lines: readonly KeyValueLine[]): Variable[] {
    return lines.map(variableOfLine);
}

/**
 * The identities kept while the list grows or shrinks from the outside: trimmed from the tail,
 * or extended there with ids none of the kept ones holds. A position keeps the identity it had
 * while it stood.
 */
export function alignedIds(ids: readonly string[], length: number): string[] {
    const kept = ids.slice(0, length);

    while (kept.length < length) {
        kept.push(nextLineId(kept.map((id) => ({ id }))));
    }

    return kept;
}
