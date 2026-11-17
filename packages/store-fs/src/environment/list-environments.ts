import { byName, type Environment, parseEnvironment } from '@mandor/schema';

import type { LoadWarning } from '../disk/load-warning.js';
import { readDocument } from '../disk/read-document.js';
import { environmentIds } from './environment-ids.js';
import { environmentFile } from './environment-path.js';

export type ListedEnvironments = {
    environments: Environment[];
    warnings: LoadWarning[];
};

/**
 * Reads every environment of a workspace, sorted by name. Environments have no order of their
 * own: nobody arranges them, and their ids mean nothing to the person reading the list.
 */
export async function listEnvironments(
    root: string,
    workspaceId: string,
): Promise<ListedEnvironments> {
    const ids = await environmentIds(root, workspaceId);
    const reads = await Promise.all(
        ids.map((id) => readDocument(environmentFile(root, workspaceId, id), parseEnvironment)),
    );

    return {
        environments: reads
            .filter((read) => read.ok)
            .map((read) => read.value)
            .toSorted(byName),
        warnings: reads.filter((read) => !read.ok).map((read) => read.warning),
    };
}
