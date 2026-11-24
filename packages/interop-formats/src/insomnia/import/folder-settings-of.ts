import { type Degradation, distinct, type LevelSettings, listOrNone } from '@mandor/interop-core';

import type { InsomniaFolder } from '../document/insomnia-tree.js';
import { authOf } from './auth-of.js';
import { variablesOf } from './environment-resources.js';
import { linesOf } from './request-resource.js';
import { scriptsOf } from './scripts-of.js';
import { withTemplates } from './template-of.js';

/**
 * The settings of a request group, one to one. Its `environment` is flattened like any other, and
 * enters as it is: it wins over the environment in Insomnia and in Mandor alike. A description is
 * words, and stays as written.
 */
export function folderSettingsOf(folder: InsomniaFolder): {
    settings: LevelSettings;
    degradations: Degradation[];
} {
    const auth = authOf(folder.authentication, 'folder');
    const variables = variablesOf([{ name: folder.name, data: folder.environment }]);
    const mapped = withTemplates({ auth: auth.auth, headers: listOrNone(linesOf(folder.headers)) });

    return {
        settings: {
            description: folder.description === '' ? undefined : folder.description,
            variables: listOrNone(variables.variables),
            scripts: scriptsOf(folder.scripts),
            ...mapped.value,
        },
        degradations: distinct([...variables.degradations, ...auth.degradations, ...mapped.notes]),
    };
}
