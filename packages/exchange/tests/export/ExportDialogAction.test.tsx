import type { OutlineNode } from '@mandor/interop-core';
import { success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExportDialogAction } from '../../src/export/components/dialog/ExportDialogAction.js';
import type { ExportChoices } from '../../src/export/components/dialog/ExportFormatMenu.js';
import { requestExport } from '../../src/export/lib/export-request.js';

import { AppProviders } from '../support/providers.js';

const NODES: OutlineNode[] = [
    {
        children: [
            { children: [], id: 'collection/0/item/0', kind: 'message', label: 'registrarPedido' },
        ],
        id: 'collection/0',
        kind: 'collection',
        label: 'Pedidos',
    },
];

beforeEach(() => {
    shellStore.getState().setActiveWorkspace('personal');
});

const FORMATS: ExportChoices = [{ id: 'asyncapi', label: 'AsyncAPI' }];

describe('the export action', () => {
    it('is a button, on the workspace scope, that opens the dialog with the outline asked for', async () => {
        vi.spyOn(bridge.export, 'outline').mockResolvedValue(
            success({ name: 'Pasarela', nodes: NODES }),
        );

        render(<ExportDialogAction formats={FORMATS} scope="workspace" />, {
            wrapper: AppProviders,
        });

        fireEvent.click(screen.getByRole('button', { name: 'Export a workspace' }));

        await waitFor(() => {
            expect(screen.getByText('Pasarela')).toBeVisible();
        });
        expect(screen.getByRole('treeitem', { name: 'registrarPedido' })).toBeVisible();
        expect(bridge.export.outline).toHaveBeenCalledWith({
            workspaceId: 'personal',
            format: 'asyncapi',
            scope: 'workspace',
        });
    });

    it('has no button on the collection scope: it waits for the line of a menu to ring it', async () => {
        vi.spyOn(bridge.export, 'outline').mockResolvedValue(
            success({ name: 'Orders API', nodes: NODES }),
        );

        render(<ExportDialogAction formats={FORMATS} scope="collection" />, {
            wrapper: AppProviders,
        });

        expect(screen.queryByRole('button', { name: 'Export a workspace' })).toBeNull();

        act(() => {
            requestExport({ collection: 'pedidos' });
        });

        await waitFor(() => {
            expect(screen.getByText('Orders API')).toBeVisible();
        });
        expect(bridge.export.outline).toHaveBeenLastCalledWith({
            workspaceId: 'personal',
            format: 'asyncapi',
            scope: 'collection',
            collection: 'pedidos',
        });
    });
});
