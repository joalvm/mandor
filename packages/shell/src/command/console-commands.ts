import { consoleStore } from '../console/console-store.js';
import type { Command } from './command-registry.js';

/** The console is the window's own, so the shell is the one that says it can be put out and away. */
export const CONSOLE_COMMANDS: readonly Command[] = [
    {
        category: 'commands:categoryWindow',
        icon: 'console',
        id: 'shell.toggleConsole',
        run: () => {
            consoleStore.getState().toggle();
        },
        title: 'commands:toggleConsole',
    },
];
