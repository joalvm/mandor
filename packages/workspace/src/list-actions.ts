import { createDeclarations } from '@mandor/shell';

/**
 * Actions the workspaces page offers beside the way a workspace is born: what the app can bring
 * in as a workspace of its own. They stand before the actions of the panel, which belong to the
 * workspace that is open; these make one.
 */
export const workspaceListActionDeclarations = createDeclarations<{ id: string }, 'content'>();
