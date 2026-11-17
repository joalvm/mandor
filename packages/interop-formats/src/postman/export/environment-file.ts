import type { FormatDocument } from '@mandor/interop-core';
import type { Environment } from '@mandor/schema';

/**
 * An environment of the workspace as the file Postman exports for its own: the same shape the
 * reader takes. A secret leaves empty and marked, since the value belongs to whoever filled it
 * in and never to a file that travels.
 */
export function environmentFileOf(environment: Environment): FormatDocument {
    return {
        id: environment.id,
        name: environment.name,
        values: environment.variables.map((variable) => ({
            key: variable.name,
            value: variable.secret ? '' : variable.value,
            type: variable.secret ? 'secret' : 'default',
            enabled: variable.enabled,
        })),
        _postman_variable_scope: 'environment',
    };
}
