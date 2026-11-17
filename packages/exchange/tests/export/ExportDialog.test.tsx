import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExportDialog } from '../../src/export/components/dialog/ExportDialog.js';
import type { ExportChoices } from '../../src/export/components/dialog/ExportFormatMenu.js';
import type { ExportFlow } from '../../src/export/hooks/useExportFlow.js';

import { AppProviders } from '../support/providers.js';

function flowOf(overrides: Partial<ExportFlow> = {}): ExportFlow {
    return {
        busy: null,
        choose: vi.fn(),
        chosen: new Set(['place']),
        format: 'asyncapi',
        load: vi.fn(),
        name: 'Pasarela',
        nodes: [
            {
                children: [{ children: [], icon: null, id: 'place', label: 'registrarPedido' }],
                icon: null,
                id: 'orders',
                label: 'Pedidos',
                open: true,
            },
        ],
        save: vi.fn(),
        setFormat: vi.fn(),
        ...overrides,
    };
}

const ASYNCAPI = { id: 'asyncapi', label: 'AsyncAPI' };
const OPENAPI = { id: 'openapi', label: 'OpenAPI' };

function renderDialog(flow: ExportFlow, formats: ExportChoices = [ASYNCAPI]): void {
    render(<ExportDialog flow={flow} formats={formats} onClose={vi.fn()} />, {
        wrapper: AppProviders,
    });
}

describe('the export dialog', () => {
    it('names the workspace, shows what would leave, and hands the go to the footer', () => {
        const flow = flowOf();

        renderDialog(flow);

        expect(screen.getByText('Export a document')).toBeVisible();
        expect(screen.getByText('Pasarela')).toBeVisible();
        expect(screen.getByRole('treeitem', { name: 'registrarPedido' })).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Export' }));

        expect(flow.save).toHaveBeenCalledTimes(1);
    });

    it('keeps the go away while the workspace is still being read', () => {
        renderDialog(flowOf({ busy: 'loading', chosen: new Set(), name: '', nodes: [] }));

        expect(screen.getByText('Reading…')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
    });

    it('keeps the go away when nothing is left marked', () => {
        renderDialog(flowOf({ chosen: new Set() }));

        expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
    });

    it('offers no format to pick when the app writes a single one', () => {
        renderDialog(flowOf());

        expect(screen.queryByRole('button', { name: /^Format:/u })).toBeNull();
    });

    it('names the format the flow is on, beside the filter', () => {
        renderDialog(flowOf({ format: 'openapi' }), [ASYNCAPI, OPENAPI]);

        expect(screen.getByRole('button', { name: 'Format: OpenAPI' })).toBeVisible();
    });

    it('asks the flow for the other format when the user picks it', async () => {
        const flow = flowOf();

        renderDialog(flow, [ASYNCAPI, OPENAPI]);

        fireEvent.pointerDown(screen.getByRole('button', { name: 'Format: AsyncAPI' }), {
            button: 0,
            ctrlKey: false,
        });
        fireEvent.click(await screen.findByRole('menuitem', { name: 'OpenAPI' }));

        expect(flow.setFormat).toHaveBeenCalledWith('openapi');
    });
});
