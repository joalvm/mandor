import { PANE_DIRECTION } from '../pane-layout/pane-layout.js';
import { usePaneLayout } from './usePaneLayout.js';

/** How the two halves of a tab stand under the layout of the window, drawn anew when it turns. */
export function usePaneDirection() {
    return PANE_DIRECTION[usePaneLayout()];
}
