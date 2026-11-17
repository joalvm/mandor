import { yamlIdsIn } from '../disk/yaml-ids-in.js';
import { environmentsDir } from './environment-path.js';

/** Ids already taken inside a workspace: a new environment must never be given one of them. */
export function environmentIds(root: string, workspaceId: string): Promise<string[]> {
    return yamlIdsIn(environmentsDir(root, workspaceId));
}
