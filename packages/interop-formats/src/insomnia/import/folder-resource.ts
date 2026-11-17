import { definedOnly, fingerprintOf, type ImportResource } from '@mandor/interop-core';

import type { InsomniaFolder } from '../document/insomnia-tree.js';
import { folderSettingsOf } from './folder-settings-of.js';
import { originOf } from './origin-of.js';

/** A folder of the collection as a folder of the workspace, with what it says of itself. */
export function folderResourceOf(
    folder: InsomniaFolder,
    sourceId: string,
    route: string,
): ImportResource {
    const level = folderSettingsOf(folder);
    const fields = definedOnly(level.settings);

    return {
        place: 'folder',
        itemKind: null,
        route,
        name: folder.name,
        fields,
        origin: originOf(sourceId, fingerprintOf({ name: folder.name, ...fields })),
        degradations: level.degradations,
    };
}
