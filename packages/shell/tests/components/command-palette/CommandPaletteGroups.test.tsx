import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { rowName } from '@mandor/ui/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CommandPaletteGroups } from '../../../src/components/command-palette/CommandPaletteGroups.js';
import type { CommandGroup } from '../../../src/command/grouped-commands.js';
import type { NamedCommand } from '../../../src/command/ranked-commands.js';

function named(id: string, name: string, shortcut?: string): NamedCommand {
    return {
        category: 'commands:categoryTab',
        icon: 'doc',
        id,
        name,
        run: () => undefined,
        shortcut,
        title: id,
    };
}

const GROUPS: CommandGroup[] = [
    {
        category: 'commands:categoryGroup',
        commands: [named('group.splitRight', 'Split group right', 'Ctrl+\\')],
    },
    {
        category: 'commands:categoryTab',
        commands: [named('tab.close', 'Close tab'), named('tab.pin', 'Pin tab')],
    },
];

function draw(highlighted: string, onRun = vi.fn()) {
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <div role="listbox">
                    <CommandPaletteGroups
                        groups={GROUPS}
                        highlighted={highlighted}
                        listId="list"
                        onRun={onRun}
                    />
                </div>
            </TooltipProvider>
        </MessagesProvider>,
    );

    return onRun;
}

afterEach(() => {
    cleanup();
});

describe('the commands of the palette under their category', () => {
    it('draws one named group per category with its commands inside', () => {
        draw('');

        const tabs = screen.getByRole('group', { name: 'Tab' });

        expect(screen.getByRole('group', { name: 'Group' })).toBeTruthy();
        expect(within(tabs).getAllByRole('option').map(rowName)).toEqual(['Close tab', 'Pin tab']);
    });

    it('marks as selected only the command that is highlighted', () => {
        draw('tab.pin');

        const selected = screen
            .getAllByRole('option')
            .filter((each) => each.ariaSelected === 'true');

        expect(selected.map(rowName)).toEqual(['Pin tab']);
    });

    it('tells each row apart inside its list by the command it runs', () => {
        draw('');

        expect(screen.getAllByRole('option').map((each) => each.id)).toEqual([
            'list-group.splitRight',
            'list-tab.close',
            'list-tab.pin',
        ]);
    });

    it('shows the shortcut of a command only when it has one', () => {
        draw('');

        expect(screen.getByText('Ctrl+\\')).toBeTruthy();
        expect(screen.getAllByRole('option')).toHaveLength(3);
        expect(document.body.textContent).not.toContain('undefined');
    });

    it('hands over the command that was chosen', () => {
        const onRun = draw('');

        fireEvent.click(screen.getByRole('option', { name: /Pin tab/ }));

        expect(onRun).toHaveBeenCalledOnce();
        expect(onRun.mock.calls[0]?.[0]).toMatchObject({ id: 'tab.pin' });
    });
});
