import { useMessages } from '@mandor/i18n';
import { ChevronDownIcon, FileCodeIcon } from '@mandor/icons';
import { Button, Menu, MenuContent, MenuItem, MenuTrigger } from '@mandor/ui';
import type { ReactNode } from 'react';

/** One format the app writes, with the name it shows for it. */
type ExportChoice = {
    /** The id of the format: main registered it, main answers for it. */
    id: string;
    /** What the list calls it. */
    label: string;
};

/** At least one: an app that writes nothing has no export to open. */
export type ExportChoices = readonly [ExportChoice, ...ExportChoice[]];

type ExportFormatMenuProps = {
    formats: ExportChoices;
    onChange: (format: string) => void;
    value: string;
};

/**
 * The format the document leaves in: a button of one size that says the chosen one and opens the
 * list with it in bold, at the left of the line above the tree. Whoever draws it leaves it out
 * when there is one format only: nothing to ask, and the filter then takes the whole line.
 */
export function ExportFormatMenu({ formats, onChange, value }: ExportFormatMenuProps): ReactNode {
    const messages = useMessages('export');
    const chosen = formats.find(({ id }) => id === value) ?? formats[0];

    return (
        <Menu checkable>
            <MenuTrigger>
                <Button
                    aria-label={messages('formatChosen', { format: chosen.label })}
                    className="h-field w-32 justify-between"
                    data-part="export-format"
                    size="sm"
                    variant="secondary"
                >
                    <span className="flex min-w-0 items-center gap-gap-icon-text">
                        <FileCodeIcon size="sm" />
                        <span className="truncate">{chosen.label}</span>
                    </span>
                    <ChevronDownIcon size="sm" />
                </Button>
            </MenuTrigger>
            <MenuContent fitTrigger>
                {formats.map(({ id, label }) => (
                    <MenuItem
                        checked={id === value}
                        key={id}
                        onSelect={() => {
                            onChange(id);
                        }}
                    >
                        {label}
                    </MenuItem>
                ))}
            </MenuContent>
        </Menu>
    );
}
