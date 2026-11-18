import type { InteropFile } from '@mandor/interop-core';

import { bruEnvironmentSchema } from './bru-schema.js';
import type { BrunoEnvironment } from './bruno-tree.js';
import { stemOf } from './file-name.js';
import { parseValue } from './parse-value.js';
import { environmentBruOf } from './read-bru.js';

/** An environment of `.bru`: it has no name inside, so it is called as its file is. */
export function environmentOfBru(file: InteropFile): BrunoEnvironment {
    const environment = parseValue(environmentBruOf(file), file.path, bruEnvironmentSchema);

    return {
        name: stemOf(file.path),
        variables: environment.variables.map((variable) => ({
            name: variable.name,
            value: variable.value,
            disabled: variable.enabled === false,
            secret: variable.secret === true,
        })),
    };
}
