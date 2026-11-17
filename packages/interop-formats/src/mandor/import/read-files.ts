import { soleFileOf, type InteropFile, type InteropRead } from '@mandor/interop-core';
import type { WorkspaceKind } from '@mandor/schema';

import { parseMandorDocument } from '../document/parse-mandor-document.js';
import { collectionResourcesOf } from './collection-resources.js';
import { globalsResourceOf } from './globals-resource.js';
import { workspaceResourcesOf } from './workspace-resources.js';

function readBundle(files: readonly InteropFile[], app: WorkspaceKind): InteropRead {
    const bundle = parseMandorDocument(soleFileOf(files).text, app);
    // The workspace names its own source: re-reading the same bundle finds what it wrote before.
    const sourceId = bundle.workspace.name;
    const globals = globalsResourceOf(bundle, sourceId);

    return {
        name: bundle.workspace.name,
        resources: [
            ...workspaceResourcesOf(bundle, sourceId),
            ...(globals === undefined ? [] : [globals]),
            ...collectionResourcesOf(bundle, sourceId),
        ],
    };
}

/**
 * A workspace import: its one file, straight to what the workspace holds. There is no model in
 * between: the bundle already says each place in the words the workspace uses.
 */
export function readFiles(files: readonly InteropFile[], app: WorkspaceKind): Promise<InteropRead> {
    return Promise.resolve().then(() => readBundle(files, app));
}
