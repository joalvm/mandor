import type { ImportResource } from '@mandor/interop-core';

import { readFiles } from '../../../src/bruno/import/read-files.js';
import { folderFiles } from './fixture.js';

/** The resources the import of a folder of fixtures writes, as the pipeline asks the codec. */
export async function resourcesOfFolder(folder: string): Promise<ImportResource[]> {
    const read = await readFiles(folderFiles(folder));

    return read.resources;
}

export function resourceAt(
    resources: readonly ImportResource[],
    place: ImportResource['place'],
    route: string,
): ImportResource {
    const found = resources.find((each) => each.place === place && each.route === route);

    if (found === undefined) {
        throw new Error(`no ${place} at "${route}"`);
    }

    return found;
}
