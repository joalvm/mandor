import { useMessages } from '@mandor/i18n';
import { Button, IconButton, Menu, MenuContent, MenuItem, MenuTrigger } from '@mandor/ui';
import type { ReactNode } from 'react';

import { useKeyValueTable } from './key-value-context.js';
import { KeyValuePresets } from './KeyValuePresets.js';

/**
 * The ways to work the whole table: the presets, the bulk text and the columns. They lie over
 * the end of the head while the rows are on, and stand alone above the text while it is bulk,
 * where only the way back to the rows is left. Both belong to the table; a caller adds nothing.
 */
export function KeyValueTools(): ReactNode {
    return (
        <>
            <KeyValuePresetsSlot />
            <KeyValueBulkToggle />
            <KeyValueColumnsMenu />
        </>
    );
}

function KeyValuePresetsSlot() {
    const table = useKeyValueTable();

    if (table.bulk) {
        return null;
    }

    return <KeyValuePresets />;
}

function KeyValueBulkToggle() {
    const messages = useMessages('environment');
    const table = useKeyValueTable();

    if (!table.bulkEdit) {
        return null;
    }

    return (
        <Button onClick={table.onToggleBulk} size="sm" variant="ghost">
            {table.bulk ? messages('keyValueBulkBack') : messages('keyValueBulk')}
        </Button>
    );
}

function KeyValueColumnsMenu() {
    const messages = useMessages('environment');
    const table = useKeyValueTable();

    if (table.bulk || !table.columnMenu) {
        return null;
    }

    return (
        <Menu>
            <MenuTrigger>
                <IconButton
                    icon="more-horizontal"
                    label={messages('keyValueMoreActions')}
                    size="sm"
                />
            </MenuTrigger>
            <MenuContent>
                <MenuItem
                    checked={table.columns.value}
                    onSelect={() => {
                        table.onColumnsChange({
                            ...table.columns,
                            value: !table.columns.value,
                        });
                    }}
                >
                    {messages('keyValueColumnValue')}
                </MenuItem>
                <MenuItem
                    checked={table.columns.description}
                    onSelect={() => {
                        table.onColumnsChange({
                            ...table.columns,
                            description: !table.columns.description,
                        });
                    }}
                >
                    {messages('keyValueColumnDescription')}
                </MenuItem>
            </MenuContent>
        </Menu>
    );
}
