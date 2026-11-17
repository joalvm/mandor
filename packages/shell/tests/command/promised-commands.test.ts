import { createFakeBridge } from '@mandor/ipc/testing';
import { createI18n } from '@mandor/i18n';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    availableCommands,
    registerShellCommands,
    registerSurface,
    registeredCommands,
    type Command,
} from '../../src/index.js';
import { createShellStore } from '../../src/shell-store.js';

/**
 * The actions the workbench promises, written down once so they can be counted.
 *
 * This is the surface the workbench ships, not a wish list: splitting along both axes, closing and
 * focusing a group, maximising, moving a tab and opening it beside, closing a tab, and reaching
 * settings, activity and the workspaces. A command missing from the register is an action the
 * palette cannot offer, and the palette is where every action lives before it lives in a key.
 *
 * Focus is one command per place a group can have, so one of them stands for all nine: the rest
 * are the same declaration counted out.
 *
 * What does not exist yet is not listed.
 */
const PROMISED_COMMANDS: readonly string[] = [
    'group.splitRight',
    'group.splitDown',
    'group.close',
    'group.focus.1',
    'group.toggleMaximized',
    'tab.moveAside',
    'tab.openAside',
    'tab.close',
    'shell.openSettings',
    'shell.openActivity',
    'shell.openOrigins',
    'workspace.switch',
];

let undo: () => void;

function commandOf(id: string): Command | undefined {
    return registeredCommands().find((command) => command.id === id);
}

/** Every key a command is drawn from, so a title that was never translated is named here. */
function unreadable(language: string): string[] {
    const translate = createI18n(language).t as (key: string) => string;

    return registeredCommands()
        .flatMap((command) => [command.category, command.title])
        .filter((key) => translate(key) === key);
}

function availableIds(): string[] {
    return availableCommands(createShellStore(createFakeBridge()).getState()).map(
        (command) => command.id,
    );
}

beforeEach(() => {
    undo = registerShellCommands();
});

afterEach(() => {
    undo();
});

describe('the surface the workbench promises', () => {
    /**
     * The rule of the spec is that every action lives in the palette before it lives in the
     * keyboard. An action that no command declares is an action the palette cannot offer, so the
     * promise is checked here and not left to whoever remembers to look.
     */
    it('registers a command for every action the workbench promises', () => {
        const missing = PROMISED_COMMANDS.filter((id) => commandOf(id) === undefined);

        expect(missing).toEqual([]);
    });

    it('gives every promised action an icon to be drawn by', () => {
        const bare = PROMISED_COMMANDS.filter((id) => (commandOf(id)?.icon ?? '') === '');

        expect(bare).toEqual([]);
    });

    /**
     * The promise is written down before the place it leads to is built. Until somebody answers
     * for the surface the palette leaves the action out, which is what keeps it a list of what
     * can be done rather than a list of what was planned.
     */
    it('keeps a promised action out of the palette until its surface has an owner', () => {
        expect(availableIds()).not.toContain('shell.openSettings');

        const undoSurface = registerSurface({ id: 'settings', open: () => undefined });

        expect(availableIds()).toContain('shell.openSettings');

        undoSurface();
    });

    it('reads every command it registers in both of the languages the app ships', () => {
        expect(unreadable('en')).toEqual([]);
        expect(unreadable('es')).toEqual([]);
    });
});
