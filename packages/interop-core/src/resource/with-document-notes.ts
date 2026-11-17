import type { Degradation } from './degradation.js';
import { distinct } from '../import/resource-parts.js';
import type { ImportResource } from './import-resource.js';

/**
 * What a document says of itself on the way in reaches the person on the row that stands for the
 * document: its collection, or the first thing it brought when it brought no collection.
 */
export function withDocumentNotes(
    resources: readonly ImportResource[],
    notes: readonly Degradation[],
): ImportResource[] {
    const holder = resources.find(({ place }) => place === 'collection') ?? resources[0];

    return resources.map((resource) =>
        resource === holder
            ? {
                  ...resource,
                  degradations: distinct([...resource.degradations, ...notes]),
              }
            : resource,
    );
}
