import {
    degradation,
    type Degradation,
    distinct,
    type InteropScript,
    type InteropSecurityScheme,
    type InteropVariable,
    listOrNone,
    variablesOf,
} from '@mandor/interop-core';
import type { AuthConfig, ImportedScript, Variable } from '@mandor/schema';

import { authAt } from './auth-at.js';
import { withDynamicFields } from './dynamic-variables.js';
import { scriptsOf } from './scripts-of.js';

/** The root of a collection or one of its folders, as the intermediate document says it. */
export type DocumentLevel = {
    description?: string | undefined;
    variables?: readonly InteropVariable[] | undefined;
    security: readonly string[] | null;
    scripts?: readonly InteropScript[] | undefined;
};

/** What a level holds once it is Mandor's. An absent key says nothing, as in its file. */
type LevelSettings = {
    description?: string | undefined;
    variables?: Variable[] | undefined;
    auth?: AuthConfig | undefined;
    importedScripts?: ImportedScript[] | undefined;
};

type LevelPlace = 'collection' | 'folder';

/** What Postman would have done with the variables of a level that Mandor resolves. */
const VARIABLE_NOTES: Record<LevelPlace, readonly Degradation[]> = {
    collection: [],
    folder: [degradation('folderVariablesWin')],
};

/**
 * The settings of one level, one to one: what the document says here stays here, and nothing goes
 * up to the workspace, which reaches every collection. Its dynamic variables are rewritten
 * wherever they mean something; a description is words, and stays as written.
 */
export function folderSettingsOf(
    level: DocumentLevel,
    schemes: Record<string, InteropSecurityScheme>,
    place: LevelPlace,
): { settings: LevelSettings; degradations: Degradation[] } {
    const auth = authAt(level.security, schemes, place);
    const variables = variablesOf(level.variables, place);
    const scripts = scriptsOf(level.scripts);
    const mapped = withDynamicFields({
        variables: listOrNone(variables.variables),
        auth: auth.auth,
        importedScripts: listOrNone(scripts.importedScripts),
    });

    return {
        settings: { description: level.description, ...mapped.fields },
        degradations: distinct([
            ...(variables.variables.length === 0 ? [] : VARIABLE_NOTES[place]),
            ...variables.degradations,
            ...auth.degradations,
            ...scripts.degradations,
            ...mapped.notes,
        ]),
    };
}
