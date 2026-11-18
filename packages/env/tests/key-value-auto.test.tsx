import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { KeyValueAutoLine } from '../src/components/key-value/key-value-line.js';
import { at, mount } from './support/key-value.js';

afterEach(cleanup);

const ANADIDAS: KeyValueAutoLine[] = [
    {
        description: 'La autorización de la pestaña Authorization',
        id: 'auth',
        locked: true,
        name: 'Authorization',
        value: 'Bearer ••••',
    },
    {
        description: 'El tipo del cuerpo',
        id: 'ct',
        name: 'Content-Type',
        value: 'application/json',
    },
    {
        calculated: true,
        description: 'La calcula quien envía',
        id: 'len',
        name: 'Content-Length',
        value: '',
    },
    {
        description: 'Quien envía se presenta; la pisa la fila de la tabla',
        id: 'ua',
        name: 'User-Agent',
        overriddenBy: 'User-Agent',
        value: 'Mandor/1.0',
    },
];

describe('the rows the app adds by itself', () => {
    it('stay hidden behind the count until the toggle asks for them', () => {
        const container = mount(undefined, { autoLines: ANADIDAS });

        expect(screen.getByRole('button', { name: '4 ocultas' })).toBeVisible();
        expect(container.querySelector('[data-part="key-value-auto-row"]')).toBeNull();
    });

    it('come out read-only, said in the same grid, each with the line that says why', () => {
        const container = mount(undefined, { autoLines: ANADIDAS });

        fireEvent.click(screen.getByRole('button', { name: '4 ocultas' }));

        const filas = container.querySelectorAll('[data-part="key-value-auto-row"]');

        expect(filas).toHaveLength(4);
        expect(filas[0]?.textContent).toContain('Authorization');
        expect(filas[2]?.textContent).toContain('Se calcula al enviar el request');
        expect(
            container.querySelectorAll('[data-part="key-value-auto-row"] [data-part="editable"]'),
        ).toHaveLength(0);
        expect(
            screen.getAllByRole('button', { name: 'Ocultar filas que añade la app' }),
        ).toHaveLength(1);
    });

    it('the locked ones stand grey, and the rest may be left out of the request', () => {
        const onAutoLinesChange = vi.fn();

        mount(undefined, { autoLines: ANADIDAS, lines: [], onAutoLinesChange });

        fireEvent.click(screen.getByRole('button', { name: '4 ocultas' }));

        const interruptores = screen.getAllByRole('checkbox', { name: 'Enviar esta entrada' });

        expect(interruptores).toHaveLength(4);
        expect(interruptores[0]).toBeDisabled();
        expect(interruptores[1]).not.toBeDisabled();

        fireEvent.click(at(interruptores, 1));

        expect(onAutoLinesChange).toHaveBeenCalledWith(
            ANADIDAS.map((each) => (each.id === 'ct' ? { ...each, left: true } : each)),
        );
    });

    it('the row a row of the table takes over is said struck through', () => {
        const container = mount(undefined, { autoLines: ANADIDAS });

        fireEvent.click(screen.getByRole('button', { name: '4 ocultas' }));

        const pisada = container.querySelectorAll('[data-part="key-value-auto-row"]')[3];

        expect(pisada?.querySelector('[data-overridden="true"]')).not.toBeNull();
        expect(pisada?.querySelectorAll('[data-overridden="true"]')).toHaveLength(2);
    });

    it('a table the app adds nothing to shows neither count nor rows', () => {
        const container = mount(undefined);

        expect(screen.queryByRole('button', { name: /ocultas/ })).toBeNull();
        expect(container.querySelector('[data-part="key-value-auto-row"]')).toBeNull();
    });
});
