import type { InteropScope } from '../scope/interop-scope.js';
import type { WorkspaceData } from './workspace-data.js';

/**
 * What of the workspace a scope reaches: a collection reaches its collections and nothing above,
 * save the address of the environments, which a spec says as its servers. The one collection a
 * door was opened on gives its name to the document, which is what the person came to take out.
 */
const CUT_BY_SCOPE: Readonly<Record<InteropScope, (data: WorkspaceData) => WorkspaceData>> = {
    collection: ({ name, collections, environments }) => ({
        name: collections.length === 1 ? (collections[0]?.name ?? name) : name,
        connections: [],
        environments: [],
        serverEnvironments: environments,
        globals: [],
        docs: [],
        collections,
    }),
    workspace: (data) => data,
};

/**
 * The workspace cut to what the scope covers, before the outline is drawn or the leaves are
 * chosen: a collection export never offers, and never writes, a connection or an environment.
 */
export function workspaceDataInScope(data: WorkspaceData, scope: InteropScope): WorkspaceData {
    return CUT_BY_SCOPE[scope](data);
}
