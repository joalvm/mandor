import { useTranslator } from '@mandor/i18n';
import { Icon } from '@mandor/icons';
import { ListRow, RowLabel } from '@mandor/ui';

import type { CommandGroup } from '../../command/grouped-commands.js';
import { paletteRowId } from '../../command/palette-row-id.js';
import type { NamedCommand } from '../../command/ranked-commands.js';

type CommandPaletteGroupsProps = {
    groups: readonly CommandGroup[];
    highlighted: string;
    /** The list the rows belong to: each row is told apart in it by its command. */
    listId: string;
    onRun: (command: NamedCommand) => void;
};

/**
 * Draws the ranked commands under the part of the window each one belongs to. The field walks
 * the rows, so none is a stop of the tabulator.
 */
export function CommandPaletteGroups({
    groups,
    highlighted,
    listId,
    onRun,
}: CommandPaletteGroupsProps) {
    const translate = useTranslator();

    return groups.map((group) => (
        <div aria-label={translate(group.category)} key={group.category} role="group">
            <span className="block px-pad-control py-1 text-2xs text-text-secondary uppercase">
                {translate(group.category)}
            </span>
            {group.commands.map((command) => (
                <ListRow
                    className="h-control"
                    id={paletteRowId(listId, command.id)}
                    key={command.id}
                    onSelect={() => {
                        onRun(command);
                    }}
                    selected={command.id === highlighted}
                    tabIndex={-1}
                >
                    <Icon name={command.icon} />
                    <RowLabel>{command.name}</RowLabel>
                    <CommandShortcut shortcut={command.shortcut} />
                </ListRow>
            ))}
        </div>
    ));
}

function CommandShortcut({ shortcut }: { shortcut: NamedCommand['shortcut'] }) {
    if (shortcut === undefined) {
        return null;
    }

    return <span className="text-2xs text-text-secondary tabular">{shortcut}</span>;
}
