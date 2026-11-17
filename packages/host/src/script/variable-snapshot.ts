import type { ScriptSnapshot } from '@mandor/script';
import { resolveText, type VariableScope } from '@mandor/vars';

import { variableScopeOf, type EnvironmentScope } from '../environment/environment-scope.js';

type SnapshotVariable = ScriptSnapshot['variables'][number];

/** The names a script may ask for: those of every level but the dynamic values, made per send. */
function namesOf(scope: VariableScope): Set<string> {
    return new Set(
        scope
            .filter((level) => level.name !== 'dynamic')
            .flatMap((level) => Object.keys(level.values)),
    );
}

/** A secret is its name alone; any other value resolves, with a secret inside it left as `{{name}}`. */
function variableOf(scope: VariableScope, name: string): SnapshotVariable {
    const owner = scope.find((level) => Object.hasOwn(level.values, name));

    if (owner?.secret?.includes(name) === true) {
        return { name, withheld: true };
    }

    return { name, value: resolveText(`{{${name}}}`, scope, { secrets: 'off' }).text };
}

/**
 * The variables of a script as it sees them when it starts: every level of the send with what
 * scripts set on top, each name once, as it resolves. No value of a secret is in it.
 */
export function variableSnapshot(
    scope: EnvironmentScope,
    script: Readonly<Record<string, string>>,
): SnapshotVariable[] {
    const composed = variableScopeOf(scope, script);

    return [...namesOf(composed)].map((name) => variableOf(composed, name));
}
