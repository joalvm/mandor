import {
    type Degradation,
    distinct,
    type LevelSettings,
    listOrNone,
    variablesOf,
} from '@mandor/interop-core';

import type { BrunoFolder } from '../document/bruno-tree.js';
import { authOf } from './auth-of.js';
import { linesOf } from './request-lines.js';
import { interopVariablesOf } from './workspace-resources.js';

/** A `folder.bru`, a `collection.bru` or their form in OpenCollection, as the tree holds them. */
type BrunoLevel = Pick<BrunoFolder, 'description' | 'headers' | 'auth' | 'variables' | 'scripts'>;

/**
 * The settings of one level, one to one: what the level says stays there, and an environment
 * overrides the variables of a collection, as in Bruno. A secret enters blank, and it says so. The
 * scripts come as they were written, not yet approved.
 */
export function folderSettingsOf(
    level: BrunoLevel,
    place: 'collection' | 'folder',
): { settings: LevelSettings; degradations: Degradation[] } {
    const auth = authOf(level.auth, place);
    const variables = variablesOf(interopVariablesOf([level.variables]), place);

    return {
        settings: {
            description: level.description === '' ? undefined : level.description,
            variables: listOrNone(variables.variables),
            auth: auth.auth,
            headers: listOrNone(linesOf(level.headers)),
            scripts: level.scripts,
        },
        degradations: distinct([...variables.degradations, ...auth.degradations]),
    };
}
