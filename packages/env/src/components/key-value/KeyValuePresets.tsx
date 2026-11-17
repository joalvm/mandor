import { ChevronDownIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import { Button, Menu, MenuContent, MenuItem, MenuTrigger } from '@mandor/ui';
import type { ReactNode } from 'react';

import { useKeyValueTable } from './key-value-context.js';

/**
 * The book of named groups the table may take in whole: one entry per preset, and the way
 * into the dialog that keeps the book. A table given no book offers nothing here.
 */
export function KeyValuePresets(): ReactNode {
    const messages = useMessages('environment');
    const table = useKeyValueTable();

    if (table.presets === undefined) {
        return null;
    }

    return (
        <Menu>
            <MenuTrigger>
                <Button size="sm" variant="ghost">
                    {messages('keyValuePresets')}
                    <ChevronDownIcon size="sm" />
                </Button>
            </MenuTrigger>
            <MenuContent>
                <MenuItem onSelect={table.openPresets}>
                    {messages('keyValuePresetsManage')}
                </MenuItem>
                {table.presets.map((preset) => (
                    <MenuItem
                        key={preset.id}
                        onSelect={() => {
                            table.applyPreset(preset.id);
                        }}
                    >
                        {preset.name}
                    </MenuItem>
                ))}
            </MenuContent>
        </Menu>
    );
}
