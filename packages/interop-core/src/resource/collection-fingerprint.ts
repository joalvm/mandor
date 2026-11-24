import { ownScriptsOrNothing } from '@mandor/schema';

import { fingerprintOf } from '../plan/fingerprint-of.js';

/** What an import owns of a collection or a folder. */
type OwnedSettings = {
    description?: unknown;
    auth?: unknown;
    variables?: unknown;
    headers?: unknown;
    scripts?: unknown;
};

/** None and an empty list are the same level: a file with no key says there are none. */
function listed(list: unknown): unknown {
    return Array.isArray(list) && list.length === 0 ? undefined : list;
}

function ownedOf(settings: OwnedSettings): Record<string, unknown> {
    return {
        description: settings.description,
        auth: settings.auth,
        variables: listed(settings.variables),
        headers: listed(settings.headers),
        scripts: ownScriptsOrNothing(settings.scripts),
    };
}

/**
 * What a re-import compares in `collection.yaml`: the name and every setting an import wrote
 * there. `undefined` keys drop out of the hash, so a collection with none of them is read back
 * with the same hash it was written with.
 */
export function collectionFingerprint(fields: OwnedSettings & { name: string }): string {
    return fingerprintOf({ name: fields.name, ...ownedOf(fields) });
}

/** The same for `folder.yaml`, without the name: a person who renames a folder edited nothing. */
export function folderFingerprint(settings: OwnedSettings): string {
    return fingerprintOf(ownedOf(settings));
}
