import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { KeyValueTable } from '../src/components/key-value/KeyValueTable.js';
import type { KeyValueLine } from '../src/components/key-value/key-value-line.js';

afterEach(cleanup);

const LINE: KeyValueLine = { disabled: false, id: '0', name: 'start', value: '2024-07-16' };

function Table({
    onLinesChange,
}: {
    onLinesChange?: (lines: readonly KeyValueLine[]) => void;
}): ReactNode {
    const [lines, setLines] = useState<KeyValueLine[]>([LINE]);

    return (
        <KeyValueTable
            columns={{ description: false, value: true }}
            environment={undefined}
            lines={lines}
            onColumnsChange={() => undefined}
            onLinesChange={(next) => {
                setLines([...next]);
                onLinesChange?.(next);
            }}
            onVariablesChange={() => undefined}
            title="Parámetros de consulta"
            typed
        />
    );
}

/** The table with one row, and its popover of type already open. */
function draw(onLinesChange: (lines: readonly KeyValueLine[]) => void): void {
    render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <Table onLinesChange={onLinesChange} />
            </TooltipProvider>
        </MessagesProvider>,
    );

    fireEvent.click(at(screen.getAllByRole('button', { name: 'Tipo' })));
}

function at(elements: HTMLElement[]): HTMLElement {
    const element = elements[0];

    if (element === undefined) {
        throw new Error('no esta');
    }

    return element;
}

function switches(): HTMLElement[] {
    return [
        ...document.querySelectorAll<HTMLElement>('[data-part="key-value-type"] [role=switch]'),
    ];
}

describe('the type popover of a row', () => {
    it('keeps required and deprecated beside their switches, always in sight', () => {
        draw(vi.fn());

        expect(screen.getByRole('switch', { name: 'Obligatorio' })).toBeVisible();
        expect(screen.getByRole('switch', { name: 'Obsoleto' })).toBeVisible();
    });

    it('turns required on from its switch, and the meta keeps it', () => {
        const onLinesChange = vi.fn();

        draw(onLinesChange);

        fireEvent.click(at(switches()));

        const last = onLinesChange.mock.lastCall?.[0] as readonly KeyValueLine[];

        expect(last[0]?.meta?.required).toBe(true);
        expect(at(switches()).getAttribute('aria-checked')).toBe('true');
    });

    it('opens the enum field when its switch asks for it, and clears it when it closes', async () => {
        const onLinesChange = vi.fn();

        draw(onLinesChange);

        const combo = screen.getByRole('combobox', { name: 'Tipo' });

        fireEvent.keyDown(combo, { key: 'Enter' });

        fireEvent.click(at(screen.getAllByRole('option', { name: 'string' })));

        fireEvent.click(at(switches().slice(-1)));

        /* El dueño guarda la intención: la clave existe, aunque todavía no tenga valores. */
        await waitFor(() => {
            const last = onLinesChange.mock.lastCall?.[0] as readonly KeyValueLine[];

            expect(last[0]?.meta?.enumValues).toBe('');
        });

        /* Y el campo de valores aparece en el panel. */
        await waitFor(() => {
            expect(
                document.querySelector('[data-part="key-value-type"] [data-part="editable"]'),
            ).not.toBeNull();
        });
    });
});
