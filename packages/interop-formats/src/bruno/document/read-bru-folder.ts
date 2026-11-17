import type { BrunoFolder, BrunoNode } from './bruno-tree.js';
import { leftOutOf } from './left-out-of.js';
import { ordered, sequenceOf } from './order-nodes.js';
import { authOfBru } from './read-bru-auth.js';
import type { BruLevel } from './read-bru-level.js';
import { rowsOfBru, variablesOfBru } from './read-bru-rows.js';

/**
 * A folder of the tree. The level is what its `folder.bru` says, and says nothing for a directory
 * that has no such file: the folder is then the directory, named as it is.
 */
export function folderOfBru(
    level: BruLevel,
    name: string,
    children: readonly BrunoNode[],
): BrunoFolder {
    return {
        kind: 'folder',
        name,
        seq: sequenceOf(level.meta?.seq),
        description: level.docs ?? '',
        headers: rowsOfBru(level.headers),
        auth: authOfBru(level.auth?.mode, level.auth),
        variables: variablesOfBru(level.vars?.req),
        children: ordered(children),
        leftOut: leftOutOf({ scripts: level.script, tests: level.tests }),
    };
}
