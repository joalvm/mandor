import type { NamedCommand } from './ranked-commands.js';

/** The commands of one part of the window, in the order the ranking left them. */
export type CommandGroup = { category: string; commands: NamedCommand[] };

/**
 * Splits a ranked list into its categories without reordering it: a group appears where its first
 * command landed, so what is nearest the top of the list stays nearest the top of the palette.
 */
export function groupedCommands(commands: readonly NamedCommand[]): CommandGroup[] {
    const groups: CommandGroup[] = [];

    for (const command of commands) {
        const group = groups.find((each) => each.category === command.category);

        if (group === undefined) {
            groups.push({ category: command.category, commands: [command] });
        } else {
            group.commands.push(command);
        }
    }

    return groups;
}
