import { registeredCommands, type Command } from '../../command/command-registry.js';
import { shellStore, type ShellStore } from '../../shell-store.js';

/**
 * When a line is offered at all. A line that is offered but cannot run is drawn disabled, so the
 * menu keeps its shape from tab to tab; one that a tab could never use is left out.
 */
export type MenuLine = { id: string; offered?: (state: ShellStore, command: Command) => boolean };

/** Whether a command runs on the tab the menu asks about; one without a condition always does. */
export function isAvailable(state: ShellStore, command: Command): boolean {
    return command.when?.(state) ?? true;
}

/** The commands a section offers the tab, in the order the section names them. */
export function offeredOf(lines: readonly MenuLine[], target: ShellStore): Command[] {
    const commands = registeredCommands();

    return lines.flatMap((line) => {
        const command = commands.find((each) => each.id === line.id);

        return command !== undefined && (line.offered?.(target, command) ?? true) ? [command] : [];
    });
}

/** The tab the menu was opened on goes in front of its group, and the command acts on it. */
export function inFront(groupId: string, tabId: string): ShellStore {
    const state = shellStore.getState();

    state.focusGroup(groupId);
    state.setActiveTab(groupId, tabId);

    return shellStore.getState();
}
