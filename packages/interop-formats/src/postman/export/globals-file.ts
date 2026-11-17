import type { FormatDocument } from '@mandor/interop-core';
import type { Variable } from '@mandor/schema';

import { environmentFileOf } from './environment-file.js';

/**
 * The variables of the workspace as the file of globals Postman exports: the same rows as an
 * environment, marked as the scope above them. It is the only file Postman has for what a
 * workspace holds, so what the workspace declares is not copied into every collection.
 */
export function globalsFileOf(variables: readonly Variable[]): FormatDocument {
    return {
        ...environmentFileOf({ id: 'globals', name: 'Globals', variables: [...variables] }),
        _postman_variable_scope: 'globals',
    };
}
