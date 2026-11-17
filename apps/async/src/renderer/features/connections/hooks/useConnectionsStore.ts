import { useStore } from 'zustand';

import { connectionsStore, type ConnectionsStore } from '../connections-store.js';

export function useConnectionsStore<T>(selector: (state: ConnectionsStore) => T): T {
    return useStore(connectionsStore, selector);
}
