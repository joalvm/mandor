import type { Environment, FolderChainLevel, Variable } from '@mandor/schema';
import { chainValues, composeScope, type VariableScope } from '@mandor/vars';

import type { ScriptVariablePreview } from '../env.slice.js';

/** One list for every place where no script set anything. */
const NO_SCRIPT_VARIABLES: readonly ScriptVariablePreview[] = [];

/**
 * The scope a field of the window paints and explains with, composed the way main resolves:
 * the folders of the item, the environment in force, the collection and the globals of the
 * origin, ordered by `composeScope` alone. A declaration switched off declares nothing — the send will not
 * read it either. What scripts set is the strongest level; the window only holds the preview of
 * each value, so a `{{x}}` a script set reads as resolved, and its hover shows that preview.
 */
export function windowScope(
    environment: Environment | undefined,
    globals: readonly Variable[],
    chain: readonly FolderChainLevel[],
    scriptVariables: readonly ScriptVariablePreview[] = NO_SCRIPT_VARIABLES,
): VariableScope {
    const declared = environment?.variables.filter((variable) => variable.enabled) ?? [];

    return composeScope({
        script: Object.fromEntries(scriptVariables.map(({ name, preview }) => [name, preview])),
        chain: chainValues(chain),
        environment: Object.fromEntries(declared.map(({ name, value }) => [name, value])),
        secret: declared.filter((variable) => variable.secret).map((variable) => variable.name),
        globals: Object.fromEntries(
            globals.filter((variable) => variable.enabled).map(({ name, value }) => [name, value]),
        ),
        globalsSecret: globals.filter((variable) => variable.secret).map(({ name }) => name),
    });
}

/** Every name the scope declares, strongest first, without the computed ones. */
export function declaredNames(scope: VariableScope): string[] {
    const names = scope
        .filter((level) => level.name !== 'dynamic' && level.name !== 'script')
        .flatMap((level) => Object.keys(level.values));

    return [...new Set(names)];
}
