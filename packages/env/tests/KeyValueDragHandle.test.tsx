import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { KeyValueLine } from '../src/components/key-value/key-value-line.js';
import { KeyValueDragHandle } from '../src/components/key-value/KeyValueDragHandle.js';
import { mountRowsInTable, namesOf, type Mounted } from './support/key-value-state.js';

afterEach(cleanup);

/** The middle row of the three the table holds: the one this handle carries. */
const CARRIED: KeyValueLine = { disabled: true, id: '1', name: 'end', value: '2024-08-16' };

function rowOf(container: HTMLElement, id: string): HTMLElement {
    const row = container.querySelector<HTMLElement>(`[data-kv-row="${id}"]`);

    if (row === null) {
        throw new Error('la fila no esta');
    }

    return row;
}

/** The rows beside the carried one are 30px tall, one above and one below the empty row. */
function draw(): { handle: HTMLElement; mounted: Mounted } {
    const mounted = mountRowsInTable(
        <>
            <tr data-index="0" data-kv-row="0" data-part="key-value-row" />
            <tr data-index="1" data-kv-row="1" data-part="key-value-row">
                <KeyValueDragHandle line={CARRIED} />
            </tr>
            <tr data-index="2" data-kv-row="2" data-part="key-value-row" />
            <tr data-ghost="true" data-kv-row="ghost" data-part="key-value-row" />
        </>,
    );

    rowOf(mounted.container, '0').getBoundingClientRect = () => new DOMRect(0, 0, 100, 30);
    rowOf(mounted.container, '2').getBoundingClientRect = () => new DOMRect(0, 60, 100, 30);

    const handle = screen.getByRole('button', { name: 'Arrastrar para reordenar' });

    handle.setPointerCapture = () => undefined;

    return { handle, mounted };
}

describe('the handle that carries a row', () => {
    it('lies out of the tab order: the keyboard reorders by other means', () => {
        const { handle } = draw();

        expect(handle).toHaveAttribute('tabindex', '-1');
    });

    it('carries the row above the first one the pointer is over', () => {
        const { handle, mounted } = draw();

        fireEvent.pointerDown(handle, { pointerId: 1 });
        fireEvent.pointerMove(handle, { clientY: 5, pointerId: 1 });

        expect(namesOf(mounted)).toEqual(['end', 'start', 'token']);
    });

    it('carries the row below the last one when the pointer is past it', () => {
        const { handle, mounted } = draw();

        fireEvent.pointerDown(handle, { pointerId: 1 });
        fireEvent.pointerMove(handle, { clientY: 500, pointerId: 1 });

        expect(namesOf(mounted)).toEqual(['start', 'token', 'end']);
    });

    it('leaves the row between its neighbours while the pointer stays between them', () => {
        const { handle, mounted } = draw();

        fireEvent.pointerDown(handle, { pointerId: 1 });
        fireEvent.pointerMove(handle, { clientY: 40, pointerId: 1 });

        expect(namesOf(mounted)).toEqual(['start', 'end', 'token']);
    });

    it('moves nothing while the pointer was not pressed on the handle', () => {
        const { handle, mounted } = draw();

        fireEvent.pointerMove(handle, { clientY: 500, pointerId: 1 });

        expect(mounted.onLines).not.toHaveBeenCalled();
    });

    it('lets the row go when the pointer is released', () => {
        const { handle, mounted } = draw();

        fireEvent.pointerDown(handle, { pointerId: 1 });
        fireEvent.pointerUp(handle, { pointerId: 1 });
        fireEvent.pointerMove(handle, { clientY: 500, pointerId: 1 });

        expect(mounted.onLines).not.toHaveBeenCalled();
    });

    it('lets the row go when the gesture is cancelled', () => {
        const { handle, mounted } = draw();

        fireEvent.pointerDown(handle, { pointerId: 1 });
        fireEvent.pointerCancel(handle, { pointerId: 1 });
        fireEvent.pointerMove(handle, { clientY: 500, pointerId: 1 });

        expect(mounted.onLines).not.toHaveBeenCalled();
    });
});
