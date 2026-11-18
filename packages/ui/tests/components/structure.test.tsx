import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConnectionIcon, FolderIcon } from '@mandor/icons';

import {
    Badge,
    Button,
    EmptyRow,
    EmptyState,
    ListRow,
    Panel,
    RowLabel,
    SplitHalf,
    SplitPane,
    StatusDot,
    TooltipProvider,
    Tree,
    TreeRow,
} from '../../src/index.js';

describe('the structural primitives', () => {
    it('exposes badges and live state without relying on color alone', () => {
        render(
            <TooltipProvider>
                <div>
                    <Badge tone="success">Conectada</Badge>
                    <StatusDot state="connected" label="Conexión activa" />
                </div>
            </TooltipProvider>,
        );

        expect(screen.getByText('Conectada')).toBeVisible();
        const dot = screen.getByRole('img', { name: 'Conexión activa' });

        expect(dot).toHaveAttribute('data-state', 'connected');
        // The window draws its own tooltip; the browser would put a native one up beside it.
        expect(dot).not.toHaveAttribute('title');
    });

    it('marks a thing that needs a person with a warning dot that has its own label', () => {
        render(
            <TooltipProvider>
                <StatusDot state="warning" label="Cambios que chocan" />
            </TooltipProvider>,
        );

        expect(screen.getByRole('img', { name: 'Cambios que chocan' })).toHaveAttribute(
            'data-state',
            'warning',
        );
    });

    /**
     * The empty regions of the lateral are one line tall and sit at the depth of the rows that
     * are missing: a block with title and description makes an empty sidebar look emptier still.
     */
    it('draws the empty region of a section as a single line that says and hints', () => {
        render(
            <EmptyRow
                description="Crea una para seguir"
                icon="connection"
                level={1}
                title="Sin conexiones"
            />,
        );

        const region = screen.getByRole('status');

        expect(region).toHaveAttribute('data-part', 'empty-row');
        expect(region).toHaveAttribute('data-level', '1');
        expect(region).toHaveTextContent('Sin conexiones');
        expect(region).toHaveTextContent('Crea una para seguir');
        expect(region.querySelector('h2')).toBeNull();
    });

    it('labels panels and writes the way out of an empty region inside it', () => {
        render(
            <Panel title="Actividad">
                <EmptyState
                    title="Sin actividad"
                    description="Conecta para empezar"
                    icon="connection"
                >
                    <Button>Conectar</Button>
                </EmptyState>
            </Panel>,
        );

        expect(screen.getByRole('region', { name: 'Actividad' })).toBeVisible();
        const emptyState = screen.getByRole('status', { name: 'Sin actividad' });

        expect(emptyState).toBeVisible();
        expect(emptyState.querySelector('svg')).toHaveAttribute('width', '24');
        expect(screen.getByRole('button', { name: 'Conectar' })).toBeVisible();
    });

    it('moves the split separator with the keyboard', () => {
        const onValueChange = vi.fn();

        render(
            <SplitPane value={50} onValueChange={onValueChange} label="Redimensionar paneles">
                <SplitHalf>Componer</SplitHalf>
                <SplitHalf>Mensajes</SplitHalf>
            </SplitPane>,
        );

        fireEvent.keyDown(screen.getByRole('separator', { name: 'Redimensionar paneles' }), {
            key: 'ArrowRight',
        });

        expect(onValueChange).toHaveBeenCalledWith(51);
    });

    it('exposes list and tree rows with selection state', () => {
        render(
            <TooltipProvider>
                <div>
                    <ListRow selected onSelect={vi.fn()}>
                        <ConnectionIcon size="sm" />
                        <RowLabel>gateway</RowLabel>
                    </ListRow>
                    <Tree
                        label="Conexiones"
                        lines={[{ expanded: true, id: 'connections', level: 1 }]}
                        onExpandedChange={vi.fn()}
                        onSelectedChange={vi.fn()}
                        selected={['connections']}
                    >
                        <TreeRow>
                            <FolderIcon size="sm" />
                            <RowLabel>conexiones</RowLabel>
                        </TreeRow>
                    </Tree>
                </div>
            </TooltipProvider>,
        );

        expect(screen.getByRole('option', { name: 'gateway' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
        const treeRow = screen.getByRole('treeitem', { name: 'conexiones' });

        expect(treeRow).toHaveClass('transition-colors');

        expect(
            screen.getByRole('option', { name: 'gateway' }).querySelector('svg'),
        ).toHaveAttribute('width', '14');
        expect(treeRow).toHaveAttribute('aria-expanded', 'true');
        expect(treeRow).toHaveAttribute('aria-selected', 'true');
        // No chevron in the row: the glyph of the node is the only figure it draws.
        expect(
            [...treeRow.querySelectorAll('svg')].map((svg) => svg.getAttribute('width')),
        ).toEqual(['14']);
        expect(screen.queryByRole('button')).toBeNull();
    });
});
