import type { WorkspaceEntries } from '@mandor/shell';

import { docsStore } from '../docs-store.js';
import { docEntries } from './doc-entries.js';

/** The docs the search of a workspace finds: the ones the store holds. */
export const workspaceDocEntries: WorkspaceEntries = (origin, workspaceId) =>
    docEntries(docsStore.getState().docs, origin, workspaceId);
