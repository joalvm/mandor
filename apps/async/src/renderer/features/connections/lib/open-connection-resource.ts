import type { ResourceUri } from '@mandor/schema';
import { shellStore } from '@mandor/shell';

import { connectionIdOf } from './connection-resource.js';

/**
 * What the open tabs call this connection. Main pushes by id and the timeline is filed under the
 * resource, so the window is asked to name it. Nothing open names it and nothing is kept: what
 * arrives for a connection nobody is looking at has no panel to land in.
 */
export function openConnectionResource(connectionId: string): ResourceUri | undefined {
    return Object.keys(shellStore.getState().resources).find(
        (resource) => connectionIdOf(resource) === connectionId,
    );
}
