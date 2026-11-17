import { degradation, fingerprintOf, type ImportResource } from '@mandor/interop-core';
import type { WorkspaceBundle } from '@mandor/schema';

import { mandorOrigin } from './mandor-origin.js';

/**
 * The globals of the bundle as the globals of the origin. A secret enters with its name and its
 * mark, and whatever a hand-edited file put in its value stays out. Writing them adds the names
 * the origin lacks and keeps every value it already has.
 */
export function globalsResourceOf(
    bundle: WorkspaceBundle,
    sourceId: string,
): ImportResource | undefined {
    if (bundle.globals.length === 0) {
        return undefined;
    }

    const variables = bundle.globals.map((variable) => ({
        ...variable,
        value: variable.secret ? '' : variable.value,
    }));

    return {
        place: 'globals',
        itemKind: null,
        route: '.',
        name: bundle.workspace.name,
        fields: { variables },
        origin: mandorOrigin(sourceId, fingerprintOf({ variables })),
        degradations: variables
            .filter((variable) => variable.secret)
            .map((variable) => degradation('secretEntersEmptyGlobals', { name: variable.name })),
    };
}
