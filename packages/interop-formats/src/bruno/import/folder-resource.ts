import { definedOnly, distinct, fingerprintOf, type ImportResource } from '@mandor/interop-core';

import type { BrunoFolder } from '../document/bruno-tree.js';
import { folderSettingsOf } from './folder-settings-of.js';
import { leftOutText } from './left-out-text.js';
import { originOf } from './origin-of.js';

/** A folder of the collection as a folder of the workspace, with what it says of itself. */
export function folderResourceOf(
    folder: BrunoFolder,
    sourceId: string,
    route: string,
): ImportResource {
    const level = folderSettingsOf(folder, 'folder');
    const fields = definedOnly(level.settings);

    return {
        place: 'folder',
        itemKind: null,
        route,
        name: folder.name,
        fields,
        origin: originOf(sourceId, fingerprintOf({ name: folder.name, ...fields })),
        degradations: distinct([...level.degradations, ...leftOutText('folder', folder.leftOut)]),
    };
}
