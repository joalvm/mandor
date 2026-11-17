import { RowOf, type CollectionRowContextValue } from '@mandor/collections/testing';
import { Menu, MenuContent, MenuTrigger } from '@mandor/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';

import { AppProviders } from './app-providers.js';

/** Opens a menu whose only lines are the ones given, drawn for the row given. */
export function openRowMenu(row: CollectionRowContextValue, lines: ReactElement): void {
    render(
        <Menu>
            <MenuTrigger>
                <button type="button">Options</button>
            </MenuTrigger>
            <MenuContent>
                <RowOf row={row}>{lines}</RowOf>
            </MenuContent>
        </Menu>,
        { wrapper: AppProviders },
    );
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Options' }), {
        button: 0,
        ctrlKey: false,
    });
}
