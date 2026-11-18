import { yamlIdsIn } from '../disk/yaml-ids-in.js';
import { connectionsDir } from './connection-path.js';

/** Ids already taken inside a workspace: a new connection must never be given one of them. */
export function connectionIds(root: string, workspaceId: string): Promise<string[]> {
    return yamlIdsIn(connectionsDir(root, workspaceId));
}
