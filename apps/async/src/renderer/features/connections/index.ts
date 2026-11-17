// The only barrel in the package. It states the public API and nothing else: inside the
// package every module imports the file that defines the symbol.

export { createConnectionsStore, connectionsStore } from './connections-store.js';
export { createConnection } from './lib/create-connection.js';
export { HANDSHAKE_SCHEMES } from './lib/handshake-schemes.js';
export { ConnectionsSidebar } from './components/sidebar/ConnectionsSidebar.js';
export { WorkspaceConnections } from './components/workspace/WorkspaceConnections.js';
export { loadConnections } from './lib/load-connections.js';
export { ConnectionDefaultsSettings } from './ConnectionDefaultsSettings.js';
export { ConnectionsSection } from './components/sidebar/ConnectionsSection.js';
export { ConnectionTabKind } from './ConnectionTabKind.js';
export { ConnectionFolderVariables } from './components/folder/ConnectionFolderVariables.js';
export {
    selectConnectionStateFor,
    selectConnections,
    selectFaultFor,
    selectRecordingFor,
} from './selectors.js';
