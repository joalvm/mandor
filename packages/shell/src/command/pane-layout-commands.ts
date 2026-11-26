import { togglePaneLayout } from '../pane-layout/pane-layout.js';
import type { Command } from './command-registry.js';

/** How the halves of a tab stand is the window's, so the shell is the one that turns it. */
export const PANE_LAYOUT_COMMANDS: readonly Command[] = [
    {
        category: 'commands:categoryWindow',
        icon: 'layout-vertical',
        id: 'shell.togglePaneLayout',
        run: () => {
            togglePaneLayout();
        },
        title: 'commands:togglePaneLayout',
    },
];
