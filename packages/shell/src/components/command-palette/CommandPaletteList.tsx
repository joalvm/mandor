import { useMessages } from '@mandor/i18n';
import { Input } from '@mandor/ui';
import { useId, useMemo, useState, type KeyboardEvent } from 'react';

import { groupedCommands } from '../../command/grouped-commands.js';
import { nextHighlight } from '../../command/highlight-move.js';
import { paletteRowId } from '../../command/palette-row-id.js';
import { rankedCommands, type NamedCommand } from '../../command/ranked-commands.js';
import { useFocusReturn } from '../../hooks/useFocusReturn.js';
import { useNamedCommands } from '../../hooks/useNamedCommands.js';
import { shellStore } from '../../shell-store.js';
import { CommandPaletteGroups } from './CommandPaletteGroups.js';

const FIELD_ID = 'command-palette-field';

type CommandPaletteListProps = {
    onClose: () => void;
    onRun: (id: string) => void;
    recent: readonly string[];
};

/** Narrows the register with what is typed and runs whatever ends up highlighted. */
export function CommandPaletteList({ onClose, onRun, recent }: CommandPaletteListProps) {
    const messages = useMessages('shell');
    const commands = useNamedCommands();
    const [highlight, setHighlight] = useState(0);
    const [query, setQuery] = useState('');
    const listId = useId();
    const listed = useMemo(
        () => rankedCommands(commands, query, recent),
        [commands, query, recent],
    );
    const activeId = listed[highlight]?.id;
    // The focus never leaves the field: aria-activedescendant names the row the arrows reached.
    const activeRow = activeId === undefined ? undefined : paletteRowId(listId, activeId);

    useFocusReturn(FIELD_ID);

    function run(command: NamedCommand | undefined): void {
        if (command === undefined) {
            return;
        }

        onRun(command.id);
        onClose();
        command.run(shellStore.getState());
    }

    /**
     * Captured on the way down: the text field stops every key it sees, so a handler waiting for
     * the bubble would never learn about the arrows.
     */
    function onKeys(event: KeyboardEvent<HTMLDivElement>): void {
        const answer = new Map([
            ['Escape', onClose],
            [
                'Enter',
                () => {
                    run(listed[highlight]);
                },
            ],
        ]).get(event.key);
        const moved = nextHighlight(event.key, highlight, listed.length);

        if (answer !== undefined) {
            event.preventDefault();
            answer();

            return;
        }

        if (moved === null) {
            return;
        }

        event.preventDefault();
        setHighlight(moved);
    }

    function onQueryChange(value: string): void {
        setQuery(value);
        setHighlight(0);
    }

    return (
        <div
            className="flex flex-col gap-gap-control"
            data-part="command-palette-list"
            onKeyDownCapture={onKeys}
        >
            <Input
                activeDescendant={activeRow}
                controls={listId}
                id={FIELD_ID}
                label={messages('searchCommands')}
                onValueChange={onQueryChange}
                placeholder={messages('searchCommands')}
                value={query}
            />
            <div
                aria-label={messages('commandPalette')}
                className="max-h-80 overflow-y-auto"
                id={listId}
                role="listbox"
            >
                <CommandResults
                    highlighted={activeId ?? ''}
                    listed={listed}
                    listId={listId}
                    onRun={run}
                />
            </div>
        </div>
    );
}

type CommandResultsProps = {
    highlighted: string;
    listed: readonly NamedCommand[];
    listId: string;
    onRun: (command: NamedCommand) => void;
};

function CommandResults({ highlighted, listed, listId, onRun }: CommandResultsProps) {
    const messages = useMessages('shell');

    if (listed.length === 0) {
        return (
            <p className="px-pad-control py-2 text-sm text-text-secondary">
                {messages('noCommands')}
            </p>
        );
    }

    return (
        <CommandPaletteGroups
            groups={groupedCommands(listed)}
            highlighted={highlighted}
            listId={listId}
            onRun={onRun}
        />
    );
}
