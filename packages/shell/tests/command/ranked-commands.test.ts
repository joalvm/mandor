import { describe, expect, it } from 'vitest';

import { rankedCommands, type NamedCommand } from '../../src/command/ranked-commands.js';

function named(id: string, name: string): NamedCommand {
    return {
        category: 'commands:categoryTab',
        icon: 'close',
        id,
        name,
        run: () => undefined,
        shortcut: undefined,
        title: id,
    };
}

const COMMANDS = [
    named('group.splitRight', 'Split group right'),
    named('tab.close', 'Close tab'),
    named('tab.pin', 'Pin tab'),
];

function ids(commands: readonly NamedCommand[]): string[] {
    return commands.map((command) => command.id);
}

describe('ranking the commands of the palette', () => {
    it('lists everything in its own order when nothing was run or typed', () => {
        const order = ['group.splitRight', 'tab.close', 'tab.pin'];

        expect(ids(rankedCommands(COMMANDS, '', []))).toEqual(order);
        expect(ids(rankedCommands(COMMANDS, '   ', []))).toEqual(order);
    });

    it('puts what was run last first, then what was run before, then the rest', () => {
        expect(ids(rankedCommands(COMMANDS, '', ['tab.pin', 'tab.close']))).toEqual([
            'tab.pin',
            'tab.close',
            'group.splitRight',
        ]);
    });

    it('keeps only what the typed words match', () => {
        expect(ids(rankedCommands(COMMANDS, 'pin', []))).toEqual(['tab.pin']);
        expect(ids(rankedCommands(COMMANDS, 'zzzz', []))).toEqual([]);
    });

    it('finds a name by the initials of its words', () => {
        expect(ids(rankedCommands(COMMANDS, 'sgr', []))).toEqual(['group.splitRight']);
    });

    it('does not reorder the list it was given', () => {
        rankedCommands(COMMANDS, '', ['tab.pin']);

        expect(ids(COMMANDS)).toEqual(['group.splitRight', 'tab.close', 'tab.pin']);
    });
});
