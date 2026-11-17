import type { ListedDoc } from '@mandor/ipc';
import type { SearchEntry } from '@mandor/shell';

import { docResource } from './doc-resource.js';

/** The searchable envelope of the docs: one entry per doc of the workspace, named by its title. */
export function docEntries(
    docs: readonly ListedDoc[],
    origin: string,
    workspaceId: string,
): SearchEntry[] {
    return docs.map((doc) => ({
        name: doc.title,
        resource: docResource(origin, workspaceId, doc.name),
        source: 'doc' as const,
        tags: [],
        trail: '',
    }));
}
