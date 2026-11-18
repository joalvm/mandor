import type { ImportPlanEntry } from '@mandor/interop-core';
import { replaceDoc } from '@mandor/store-fs';

/**
 * Writes one note of the workspace: the route is the name of its file and `fields.text` is what
 * it says, exactly as it arrived, front matter and all: the title travels in it. A note holds no origin to attribute, so the one that was there
 * is the person's and the plan has already stopped on it as a conflict before this runs.
 */
export async function writeDocEntry(
    root: string,
    workspaceId: string,
    entry: ImportPlanEntry,
): Promise<void> {
    const text = entry.resource?.fields['text'];

    if (typeof text !== 'string') {
        throw new Error(`the doc ${entry.route} carries no text`);
    }

    await replaceDoc(root, workspaceId, entry.route, text);
}

/** A note names no origin, so no import wrote it and no import takes it away. */
export function removeDocEntry(_root: string, _workspaceId: string, route: string): Promise<void> {
    return Promise.reject(
        new Error(`the doc ${route} is the person's: an import never removes it`),
    );
}
