import { CONSOLE_COMMANDS } from './console-commands.js';
import { GROUP_COMMANDS } from './group-commands.js';
import { PANE_LAYOUT_COMMANDS } from './pane-layout-commands.js';
import { TAB_COMMANDS } from './tab-commands.js';
import { TAB_WALK_COMMANDS } from './tab-walk-commands.js';
import { WINDOW_COMMANDS } from './window-commands.js';
import { registerCommand } from './command-registry.js';

/**
 * The grid belongs to the shell, so the shell is what says out loud that it can be split,
 * closed, focused and maximised. A feature declares what it knows how to do the same way, and
 * neither of them learns anything about the palette that draws them.
 *
 * The commands that reach a surface of the window are declared here too, even where nobody
 * answers for the surface yet: the promise is what is written down, and the answer arrives with
 * whoever builds the place.
 */
export function registerShellCommands(): () => void {
    const all = [
        ...CONSOLE_COMMANDS,
        ...GROUP_COMMANDS,
        ...PANE_LAYOUT_COMMANDS,
        ...TAB_COMMANDS,
        ...TAB_WALK_COMMANDS,
        ...WINDOW_COMMANDS,
    ];
    const undo = all.map((command) => registerCommand(command));

    return () => {
        for (const each of undo) {
            each();
        }
    };
}
