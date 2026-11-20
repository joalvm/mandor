import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { TimelineNarrowing } from '../../../src/renderer/activity/lib/timeline-narrowing.js';
import { ActivityHead } from '../../../src/renderer/activity/components/panel/ActivityHead.js';

const ALL_SIDES: TimelineNarrowing = {
    query: '',
    schemaOnly: false,
    sides: { inbound: true, other: true, outbound: true },
};

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

function draw(
    narrowing: TimelineNarrowing = ALL_SIDES,
    exportable = true,
): {
    onClear: () => void;
    onExport: () => void;
    onNarrowingChange: (next: TimelineNarrowing) => void;
    rerender: (narrowing: TimelineNarrowing) => void;
} {
    const onClear = vi.fn();
    const onExport = vi.fn();
    const onNarrowingChange = vi.fn();

    const head = (
        <ActivityHead
            exportable={exportable}
            narrowing={narrowing}
            onClear={onClear}
            onNarrowingChange={onNarrowingChange}
            onExport={onExport}
        />
    );
    const view = render(<Wrapper>{head}</Wrapper>);

    return {
        onClear,
        onExport,
        onNarrowingChange,
        rerender: (next: TimelineNarrowing) => {
            view.rerender(
                <Wrapper>
                    <ActivityHead
                        exportable={exportable}
                        narrowing={next}
                        onClear={onClear}
                        onNarrowingChange={onNarrowingChange}
                        onExport={onExport}
                    />
                </Wrapper>,
            );
        },
    };
}

/** Radix opens the menu on pointerdown of its trigger, and runs the line on click. */
function openFilterMenu(): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Filtrar' }), {
        button: 0,
        ctrlKey: false,
    });
}

describe('the head of the timeline', () => {
    it('offers the three sides of the traffic and keeps the way back out of reach while nothing is hidden', async () => {
        draw();

        openFilterMenu();

        expect(await screen.findByRole('menuitem', { name: 'Recibido' })).toBeVisible();
        expect(screen.getByRole('menuitem', { name: 'Enviado' })).toBeVisible();
        expect(screen.getByRole('menuitem', { name: 'Error' })).toBeVisible();
        expect(
            screen.getByRole('menuitem', { name: 'Solo las que incumplen su schema' }),
        ).toBeVisible();
        // Radix marks a disabled line with the attribute, not with the property.
        expect(screen.getByRole('menuitem', { name: 'Mostrar todo' })).toHaveAttribute(
            'aria-disabled',
            'true',
        );
    });

    it('asks the panel to drop one side and, from there, to bring every side back', async () => {
        const { onNarrowingChange, rerender } = draw();

        openFilterMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Recibido' }));

        expect(onNarrowingChange).toHaveBeenCalledWith({
            query: '',
            schemaOnly: false,
            sides: { inbound: false, other: true, outbound: true },
        });

        // The head holds no state of its own: the answer arrives as new props.
        rerender({
            query: '',
            schemaOnly: false,
            sides: { inbound: false, other: true, outbound: true },
        });

        openFilterMenu();

        expect(screen.getByRole('menuitem', { name: 'Mostrar todo' })).toBeEnabled();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Mostrar todo' }));

        expect(onNarrowingChange).toHaveBeenLastCalledWith({
            query: '',
            schemaOnly: false,
            sides: { inbound: true, other: true, outbound: true },
        });
    });

    it('asks the panel to keep only what breaks its schema, and says so while the mark is on', async () => {
        const { onNarrowingChange, rerender } = draw();

        openFilterMenu();
        fireEvent.click(
            await screen.findByRole('menuitem', { name: 'Solo las que incumplen su schema' }),
        );

        expect(onNarrowingChange).toHaveBeenCalledWith({
            query: '',
            schemaOnly: true,
            sides: { inbound: true, other: true, outbound: true },
        });

        rerender({
            query: '',
            schemaOnly: true,
            sides: { inbound: true, other: true, outbound: true },
        });

        openFilterMenu();

        // The menu marks the line it holds: the chosen one carries the weight, not a glyph of
        // the menu's own — the triangle beside the text is the line's, and it stays.
        const item = screen.getByRole('menuitem', { name: 'Solo las que incumplen su schema' });

        expect(item).toHaveClass('font-semibold');
        expect(screen.getByRole('menuitem', { name: 'Mostrar todo' })).toBeEnabled();
    });

    it('hands the query of the search to the panel as it is typed', () => {
        const { onNarrowingChange } = draw();

        const search = screen.getByRole('searchbox', { name: 'Buscar' });

        search.textContent = 'pedido';
        fireEvent.input(search);

        expect(onNarrowingChange).toHaveBeenCalledWith({
            query: 'pedido',
            schemaOnly: false,
            sides: { inbound: true, other: true, outbound: true },
        });
    });

    it('keeps the two actions on what the timeline holds idle while there is nothing to act on', () => {
        draw(ALL_SIDES, false);

        expect(screen.getByRole('button', { name: 'Exportar' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Limpiar' })).toBeDisabled();
    });

    it('runs export and clear where the timeline says', () => {
        const { onClear, onExport } = draw();

        fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
        fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));

        expect(onExport).toHaveBeenCalledOnce();
        expect(onClear).toHaveBeenCalledOnce();
    });

    it('puts what its owner gives it first among the actions', () => {
        render(
            <Wrapper>
                <ActivityHead
                    exportable
                    narrowing={ALL_SIDES}
                    onClear={vi.fn()}
                    onNarrowingChange={vi.fn()}
                    onExport={vi.fn()}
                >
                    <button type="button">Grabar</button>
                </ActivityHead>
            </Wrapper>,
        );

        const actions = document.querySelector('[data-part="activity-head-actions"]');

        expect(actions?.firstElementChild).toBe(screen.getByRole('button', { name: 'Grabar' }));
    });
});
