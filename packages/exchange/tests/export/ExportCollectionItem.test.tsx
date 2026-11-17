import { IconButton, Menu, MenuContent, MenuTrigger } from '@mandor/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExportCollectionItem } from '../../src/export/components/menu/ExportCollectionItem.js';
import { onExportRequested } from '../../src/export/lib/export-request.js';

import { AppProviders } from '../support/providers.js';

describe('the line of the menu of a collection that takes it out', () => {
    it('rings the doorbell with the collection the menu belongs to', async () => {
        const heard = vi.fn();
        const stop = onExportRequested(heard);

        render(
            <Menu>
                <MenuTrigger>
                    <IconButton icon="more-horizontal" label="Options" />
                </MenuTrigger>
                <MenuContent>
                    <ExportCollectionItem collection="pedidos" />
                </MenuContent>
            </Menu>,
            { wrapper: AppProviders },
        );
        fireEvent.pointerDown(screen.getByRole('button', { name: 'Options' }), {
            button: 0,
            ctrlKey: false,
        });
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Export…' }));
        stop();

        expect(heard).toHaveBeenCalledWith({ collection: 'pedidos' });
    });
});
