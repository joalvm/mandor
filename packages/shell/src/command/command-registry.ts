import type { IconName } from '@mandor/ui';

import type { ShellStore } from '../shell-store.js';

/**
 * Something the window knows how to do, as data. The shell keeps the register and never learns
 * what any of them means: a feature says what it can do, and the palette shows it.
 *
 * `title` and `category` are message keys, not text. A command outlives the language it is read
 * in, so the string is looked up where it is drawn and not where it is declared.
 */
export type Command = {
    category: string;
    /** Drawn beside the title, so a command is recognised before it is read. */
    icon: IconName;
    id: string;
    run: (state: ShellStore) => void;
    title: string;
    /** Values for the placeholders of `title`, for the commands that are one shape many times. */
    titleValues?: Record<string, number | string> | undefined;
    /** Read against the store, never against the DOM. Without one, the command always applies. */
    when?: ((state: ShellStore) => boolean) | undefined;
};

const COMMANDS = new Map<string, Command>();

/** Registers what a feature knows how to do and returns its matching cleanup. */
export function registerCommand(command: Command): () => void {
    COMMANDS.set(command.id, command);

    return () => {
        if (COMMANDS.get(command.id) === command) {
            COMMANDS.delete(command.id);
        }
    };
}

/**
 * What the window can do right now, in the order the commands were registered.
 *
 * A command that does not apply is left out instead of drawn greyed: the palette is a list of
 * what is possible, and an entry that cannot be chosen is a question the reader has to answer.
 */
export function availableCommands(state: ShellStore): readonly Command[] {
    return [...COMMANDS.values()].filter((command) => command.when?.(state) ?? true);
}

/**
 * Every command there is, whether or not it applies right now.
 *
 * The palette never asks for this: what it draws is what can be chosen. It exists so the surface
 * the workbench promises can be counted against what was declared.
 */
export function registeredCommands(): readonly Command[] {
    return [...COMMANDS.values()];
}
