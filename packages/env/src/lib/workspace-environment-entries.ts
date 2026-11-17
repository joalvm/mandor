import type { WorkspaceEntries } from '@mandor/shell';

import { envStore } from '../env-store.js';
import { environmentEntries, globalsEntries } from './environment-entries.js';

/**
 * The environments and variables the search of a workspace finds, the globals of the origin
 * among them: the ones the store holds. The trail of a global says the word for them, as the file
 * is the one of its kind in the origin.
 */
export const workspaceEnvironmentEntries: WorkspaceEntries = (origin, workspaceId, translate) => {
    const { environments, globals } = envStore.getState();

    return [
        ...environmentEntries(environments, origin, workspaceId),
        ...globalsEntries(globals, origin, workspaceId, translate('environment:globals')),
    ];
};
