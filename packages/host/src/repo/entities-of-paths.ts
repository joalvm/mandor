import type { ChangedEntity } from '@mandor/schema';
import { entityOfPath } from '@mandor/store-fs';

/** The entities of the paths, once each, leaving out what is not part of the shape of a repo. */
export function entitiesOfPaths(paths: string[]): ChangedEntity[] {
    const seen = new Map<string, ChangedEntity>();

    for (const path of paths) {
        const entity = entityOfPath(path);

        if (entity !== null) {
            seen.set(JSON.stringify(entity), entity);
        }
    }

    return [...seen.values()];
}
