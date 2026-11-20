import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
    Button,
    Collapsible,
    CollapsibleBody,
    CollapsibleHeader,
    IconButton,
    TooltipProvider,
} from '../../src/index.js';
import { byPart } from '../../src/testing/by-part.js';

describe('a foldable section', () => {
    /** A section of the sidebar folds; it never disappears, and its header keeps its actions. */
    it('folds a section without swallowing the actions of its header', () => {
        const onOpenChange = vi.fn();
        const onAdd = vi.fn();

        render(
            <Collapsible onOpenChange={onOpenChange} open>
                <CollapsibleHeader title="Conexiones">
                    <Button onClick={onAdd}>Nueva conexión</Button>
                </CollapsibleHeader>
                <CollapsibleBody>
                    <div>gateway</div>
                </CollapsibleBody>
            </Collapsible>,
        );

        const trigger = screen.getByRole('button', { name: 'Conexiones' });

        // The header reads as a heading in sentence case: a weight heavier than the rows, with the
        // same ink — the hierarchy is weight, never capitals or colour.
        expect(trigger).toHaveClass('text-xs', 'font-semibold', 'text-text-primary');
        expect(trigger).not.toHaveClass('uppercase');
        expect(byPart('collapsible-header')).toHaveClass('h-control');
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('gateway')).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Nueva conexión' }));

        expect(onAdd).toHaveBeenCalledTimes(1);
        expect(onOpenChange).not.toHaveBeenCalled();

        fireEvent.click(trigger);

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    /** The count is read in passing; the list under it is what a screen reader counts. */
    it('counts what the region holds after its title, in the lighter ink, and only when told', () => {
        const { rerender } = render(
            <Collapsible onOpenChange={vi.fn()} open>
                <CollapsibleHeader count={3} title="Conexiones" />
            </Collapsible>,
        );

        const count = byPart('collapsible-count');

        expect(count).toHaveTextContent('3');
        expect(count).toHaveClass('text-text-tertiary');
        expect(count).toHaveAttribute('aria-hidden', 'true');
        expect(screen.getByRole('button', { name: 'Conexiones' })).toContainElement(count);

        rerender(
            <Collapsible onOpenChange={vi.fn()} open>
                <CollapsibleHeader title="Conexiones" />
            </Collapsible>,
        );

        expect(document.querySelector('[data-part="collapsible-count"]')).toBeNull();
    });

    it('hides the body of a folded section and keeps announcing its header', () => {
        render(
            <Collapsible onOpenChange={vi.fn()} open={false}>
                <CollapsibleHeader title="Documentos" />
                <CollapsibleBody>
                    <div>guía</div>
                </CollapsibleBody>
            </Collapsible>,
        );

        expect(screen.getByRole('button', { name: 'Documentos' })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
        expect(screen.queryByText('guía')).toBeNull();
    });

    /** The header's buttons live in one box, flush against the end; a header with none draws no empty box. */
    it('gathers the actions of the header in one box, and draws no box without them', () => {
        const { container, rerender } = render(
            <Collapsible onOpenChange={vi.fn()} open>
                <CollapsibleHeader title="Documentos">
                    <Button>Nuevo</Button>
                </CollapsibleHeader>
            </Collapsible>,
        );

        expect(byPart('collapsible-actions', container)).toContainElement(
            screen.getByRole('button', { name: 'Nuevo' }),
        );

        rerender(
            <Collapsible onOpenChange={vi.fn()} open>
                <CollapsibleHeader title="Documentos" />
            </Collapsible>,
        );

        expect(byPart('collapsible-actions', container)).toBeEmptyDOMElement();
    });

    /** The header decides the box, the glyph and the ink of the buttons it holds, whatever they ask for. */
    it('puts an icon button of the header in the compact box, the small glyph and the quiet ink', () => {
        render(
            <TooltipProvider>
                <Collapsible onOpenChange={vi.fn()} open>
                    <CollapsibleHeader title="Documentos">
                        <IconButton icon="add" label="Nuevo documento" size="md" />
                    </CollapsibleHeader>
                </Collapsible>
                <IconButton icon="add" label="Fuera" size="md" />
            </TooltipProvider>,
        );

        const inside = screen.getByRole('button', { name: 'Nuevo documento' });
        const outside = screen.getByRole('button', { name: 'Fuera' });

        expect(inside).toHaveClass('size-control-xs', 'text-text-secondary');
        expect(byPart('icon', inside)).toHaveAttribute('width', '14');
        expect(outside).toHaveClass('size-control');
        expect(outside).not.toHaveClass('text-text-secondary');
        expect(byPart('icon', outside)).toHaveAttribute('width', '16');
    });
});
