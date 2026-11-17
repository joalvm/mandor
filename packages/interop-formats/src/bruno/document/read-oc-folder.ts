import type { BrunoFolder, BrunoNode } from './bruno-tree.js';
import { leftOutOf } from './left-out-of.js';
import { ordered, sequenceOf } from './order-nodes.js';
import { authOfOpenCollection } from './read-oc-auth.js';
import { rowsOf } from './read-oc-parts.js';
import { noteOf, type OcItem } from './read-oc-request.js';
import { variablesFrom } from './read-oc-variables.js';

/**
 * A folder of the tree. The item is what its `folder.yml` says, and is absent for a directory
 * that has no such file: the folder is then the directory, named as it is.
 */
export function folderOf(
    item: OcItem | undefined,
    name: string,
    children: readonly BrunoNode[],
): BrunoFolder {
    const defaults = item?.request;

    return {
        kind: 'folder',
        name,
        seq: sequenceOf(item?.info?.seq),
        description: item === undefined ? '' : noteOf(item),
        headers: rowsOf(defaults?.headers),
        auth: authOfOpenCollection(defaults?.auth),
        variables: variablesFrom(defaults?.variables),
        children: ordered(children),
        leftOut: leftOutOf({ scripts: defaults?.scripts, actions: defaults?.actions }),
    };
}
