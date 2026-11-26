import { useStore } from 'zustand';

import { paneLayoutStore, type PaneLayout } from '../pane-layout/pane-layout.js';

/** The layout the halves of every tab stand in, drawn anew when it is turned. */
export function usePaneLayout(): PaneLayout {
    return useStore(paneLayoutStore, (state) => state.layout);
}
