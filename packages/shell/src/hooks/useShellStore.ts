import { useStore } from 'zustand';

import { shellStore, type ShellStore } from '../shell-store.js';

export function useShellStore<T>(selector: (state: ShellStore) => T): T {
    return useStore(shellStore, selector);
}
