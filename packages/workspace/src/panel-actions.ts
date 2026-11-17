import { createDeclarations } from '@mandor/shell';

/**
 * Actions the workspace panel offers beside its form. The panel is shared by the two apps, so
 * what only one of them can do — importing a document, say — is declared from the app's tree, and
 * the panel draws whatever is declared without knowing a single name.
 */
export const workspacePanelActionDeclarations = createDeclarations<{ id: string }, 'content'>();
