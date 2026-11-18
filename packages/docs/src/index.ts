// The only barrel of the package. It states what an app may reach and nothing else: inside,
// every module imports the file that defines the symbol.

export { DocCommands } from './components/editor/DocCommands.js';
export { DocDescription } from './components/surface/DocDescription.js';
export { DocView } from './components/view/DocView.js';
export { WorkspaceDocs } from './components/workspace/WorkspaceDocs.js';
export { workspaceDocEntries } from './lib/workspace-doc-entries.js';
export { DocPreviewTabKind } from './DocPreviewTabKind.js';
export { DocsSection } from './components/sidebar/DocsSection.js';
export { DocTabKind } from './DocTabKind.js';
export { FolderDocs } from './components/folder/FolderDocs.js';
