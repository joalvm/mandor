import type { ImportResource } from '@mandor/interop-core';

import { readFiles } from '../../../src/insomnia/import/read-files.js';
import { fixtureText } from './fixture.js';

/** The resources the import of a fixture writes, as the pipeline asks the codec for them. */
export async function resourcesOfFixture(name: string): Promise<ImportResource[]> {
    const read = await readFiles([{ path: name, text: fixtureText(name) }]);

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
