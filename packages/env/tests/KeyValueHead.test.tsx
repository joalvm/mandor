import { allByPart } from '@mandor/ui/testing';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { mount } from './support/key-value.js';

afterEach(cleanup);

/** The share of the width each column of text stands on, read from the grid the table writes. */
function weightsOf(): number[] {
    const table = screen.getByRole('table');
    const template = table.style.getPropertyValue('--table-columns');

    return Array.from(template.matchAll(/([\d.]+)fr/g), (match) => Number(match[1]));
}

/** The edge of a column whose cell the browser would measure `width` pixels wide. */
function edgeOf(name: string, width: number): HTMLElement {
    const cell = screen.getByRole('columnheader', { name });
    const [edge] = allByPart('table-resize', cell);

    if (edge === undefined) {
        throw new Error('el borde no esta');
    }

    cell.getBoundingClientRect = () => new DOMRect(0, 0, width, 28);
    edge.setPointerCapture = () => undefined;

    return edge;
}

describe('the head of a table of pairs', () => {
    it('names the columns in force, the key always among them', () => {
        mount();

        expect(screen.getByRole('columnheader', { name: 'Clave' })).toBeVisible();
        expect(screen.getByRole('columnheader', { name: 'Valor' })).toBeVisible();
        expect(screen.queryByRole('columnheader', { name: 'Descripción' })).toBeNull();
    });

    it('names the description too when that column is on', () => {
        mount(undefined, { columns: { description: true, value: true } });

        expect(screen.getByRole('columnheader', { name: 'Descripción' })).toBeVisible();
    });

    it('names the handle and the switch only for a screen reader', () => {
        mount();

        expect(
            screen.getByRole('columnheader', { name: 'Arrastrar para reordenar' }),
        ).toBeVisible();
        expect(screen.getByRole('columnheader', { name: 'Enviar esta entrada' })).toBeVisible();
    });

    it('carries the ways to work the whole table over its end', () => {
        mount();

        const tools = screen.getByRole('columnheader', { name: /Acciones/ });

        expect(within(tools).getByRole('button', { name: 'Edición masiva' })).toBeVisible();
        expect(within(tools).getByRole('button', { name: 'Más acciones' })).toBeVisible();
    });

    it('stretches the key from its edge, and the value gives up what the key takes', () => {
        mount();

        const edge = edgeOf('Clave', 220);
        const [key = 0, value = 0] = weightsOf();

        fireEvent.pointerDown(edge, { clientX: 400, pointerId: 1 });
        fireEvent.pointerMove(edge, { clientX: 500, pointerId: 1 });
        fireEvent.pointerUp(edge, { pointerId: 1 });

        const [wider = 0, narrower = 0] = weightsOf();

        expect(wider).toBeGreaterThan(key);
        expect(wider + narrower).toBeCloseTo(key + value, 5);
    });

    it('leaves the last column without an edge: its edge is the frame', () => {
        mount();

        expect(
            allByPart('table-resize', screen.getByRole('columnheader', { name: 'Valor' })),
        ).toEqual([]);
    });
});
