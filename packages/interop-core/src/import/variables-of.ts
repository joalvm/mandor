import { degradation, type Degradation, type DegradationCode } from '../resource/degradation.js';
import { variableNameSchema, type Variable } from '@mandor/schema';

import type { InteropVariable } from '../ir/interop-document.js';

/**
 * Where imported variables land: a collection and a folder keep them plain, in a file that goes
 * to the repo; an environment and the globals keep a secret with its mark, and whoever writes them
 * sends its value to the store of the system.
 */
export type VariablePlace = 'collection' | 'folder' | 'environment' | 'globals';

export type VariablesMapping = { variables: Variable[]; degradations: Degradation[] };

/**
 * The variables of a level that Mandor can hold. A name it cannot use is left out. A secret keeps
 * its value where it can keep its mark; a collection or a folder is a shared file that cannot
 * mark one, so there it enters blank and says where the value belongs.
 */
export function variablesOf(
    variables: readonly InteropVariable[] | undefined,
    place: VariablePlace,
): VariablesMapping {
    const kept: Variable[] = [];
    const degradations: Degradation[] = [];

    for (const variable of variables ?? []) {
        if (!variableNameSchema.safeParse(variable.name).success) {
            degradations.push(degradation('variableNameUnusable', { name: variable.name }));

            continue;
        }

        const loss = variable.secret ? SECRET_LOSS[place] : undefined;

        kept.push(loss === undefined ? { ...variable } : blanked(variable));

        if (loss !== undefined) {
            degradations.push(degradation(loss, { name: variable.name }));
        }
    }

    return { variables: kept, degradations };
}

function blanked(variable: InteropVariable): Variable {
    return { name: variable.name, value: '', enabled: variable.enabled, secret: false };
}

/** What a secret is told where it cannot stay one. */
const SECRET_LOSS: Partial<Record<VariablePlace, DegradationCode>> = {
    collection: 'secretCollectionVariableNotImported',
    folder: 'secretFolderVariableNotImported',
};
