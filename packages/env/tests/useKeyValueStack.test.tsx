import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { KeyValueColumns, KeyValueLine } from '../src/components/key-value/key-value-line.js';
import { KeyValueTable } from '../src/components/key-value/KeyValueTable.js';

const LINES: readonly KeyValueLine[] = [
    { description: 'de qué fecha', disabled: false, id: '0', name: 'start', value: '2024' },
];

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

/** The table, laid out at a width: jsdom lays out nothing, so the width is told to it. */
function drawAt(width: number, columns: KeyValueColumns): HTMLElement {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        width,
    } as DOMRect);
    vi.stubGlobal(
        'ResizeObserver',
        class {
            constructor(private readonly answer: () => void) {}

            observe(box: Element): void {
                // The window of rows watches too, and it has nothing to learn here.
                if (box.matches('[data-part="key-value-table"]')) {
                    this.answer();
                }
            }

            unobserve(): void {
                return undefined;
            }

            disconnect(): void {
                return undefined;
            }
        },
    );

    const { container } = render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <KeyValueTable
                    columns={columns}
                    environment={undefined}
                    lines={LINES}
                    onColumnsChange={() => undefined}
                    onLinesChange={() => undefined}
                    onVariablesChange={() => undefined}
                    title="Parámetros"
                    typed={false}
                />
            </TooltipProvider>
        </MessagesProvider>,
    );

    return container;
}

const BOTH: KeyValueColumns = { description: true, value: true };

describe('the description of a narrow table', () => {
    it('stands in its own column while the table has room for three', () => {
        const container = drawAt(800, BOTH);

        expect(screen.getByRole('columnheader', { name: 'Descripción' })).toBeVisible();
        expect(container.querySelector('[data-kv-stacked]')).toBeNull();
    });

    it('gives its column up to key and value, and stays in the row with what it says', () => {
        const container = drawAt(400, BOTH);

        expect(screen.queryByRole('columnheader', { name: 'Descripción' })).toBeNull();
        expect(screen.getByRole('columnheader', { name: 'Clave' })).toBeVisible();
        expect(screen.getByRole('columnheader', { name: 'Valor' })).toBeVisible();
        expect(container.querySelector('[data-kv-stacked]')).not.toBeNull();
        expect(screen.getAllByRole('textbox', { name: 'Descripción' })[0]).toHaveTextContent(
            'de qué fecha',
        );
    });

    it('says what it is where no head names it any more', () => {
        drawAt(400, BOTH);

        const ghost = screen.getAllByRole('textbox', { name: 'Descripción' }).at(-1);

        expect(ghost).toHaveAttribute('data-placeholder', 'Descripción');
    });

    it('keeps its column when the value gave up its own and there is room for both', () => {
        drawAt(400, { description: true, value: false });

        expect(screen.getByRole('columnheader', { name: 'Descripción' })).toBeVisible();
    });

    it('stays out when the reader took it away', () => {
        drawAt(400, { description: false, value: true });

        expect(screen.queryByRole('textbox', { name: 'Descripción' })).toBeNull();
    });

    it('takes no decision before the table has a width', () => {
        drawAt(0, BOTH);

        expect(screen.getByRole('columnheader', { name: 'Descripción' })).toBeVisible();
    });
});
