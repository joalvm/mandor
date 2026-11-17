import { describe, expect, it } from 'vitest';

import { groupedCommands } from '../../src/command/grouped-commands.js';
import type { NamedCommand } from '../../src/command/ranked-commands.js';

function named(id: string, category: string): NamedCommand {
    return {
        category,
        icon: 'close',
        id,
        name: id,
        run: () => undefined,
        shortcut: undefined,
        title: id,
    };
}

function ids(commands: readonly NamedCommand[]): string[] {
    return commands.map((command) => command.id);
}

describe('splitting a ranked list into categories', () => {
    it('answers nothing for no commands', () => {
        expect(groupedCommands([])).toEqual([]);
    });

    it('puts a group where its first command landed and keeps the order inside it', () => {
        const groups = groupedCommands([
            named('a1', 'tab'),
            named('b1', 'group'),
            named('a2', 'tab'),
            named('c1', 'window'),
            named('b2', 'group'),
        ]);

        expect(groups.map((group) => group.category)).toEqual(['tab', 'group', 'window']);
        expect(groups.map((group) => ids(group.commands))).toEqual([
            ['a1', 'a2'],
            ['b1', 'b2'],
            ['c1'],
        ]);
    });

    it('leaves the list it was given untouched', () => {
        const commands = [named('a1', 'tab'), named('a2', 'tab')];

        groupedCommands(commands);

        expect(ids(commands)).toEqual(['a1', 'a2']);
    });
});
