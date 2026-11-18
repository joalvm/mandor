import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { KeyValueLine } from '../src/components/key-value/key-value-line.js';
import { mount } from './support/key-value.js';

afterEach(cleanup);

/** The value line of the row on screen: the empty row of the end stands after it. */
function valueOfRow(): HTMLElement {
    const input = screen.getAllByRole('textbox', { name: 'Valor' })[0];

    if (input === undefined) {
        throw new Error('no value line');
    }

    return input;
}

const SECRET: KeyValueLine[] = [
    { disabled: false, id: '0', name: 'api_token', secret: true, value: 'hx7_qW2mRt9vL4pX' },
];

describe('a secretable table', () => {
    it('wears the marked value as dots, says it with a badge, and offers its eye', () => {
        mount(undefined, { lines: SECRET, secretable: true, variables: false });

        const value = valueOfRow();

        expect(value).toHaveTextContent('••••••••••••••');
        expect(value).not.toHaveTextContent('hx7_qW2mRt9vL4pX');
        expect(screen.getByText('secreta')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Revelar valor' })).toBeVisible();
    });

    it('reveals the value from its own eye, and hides it from the same one', () => {
        mount(undefined, { lines: SECRET, secretable: true, variables: false });

        fireEvent.click(screen.getByRole('button', { name: 'Revelar valor' }));

        expect(valueOfRow()).toHaveTextContent('hx7_qW2mRt9vL4pX');
        expect(screen.getByRole('button', { name: 'Ocultar valor' })).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Ocultar valor' }));

        expect(valueOfRow()).toHaveTextContent('•');
    });

    /**
     * Revealing is an act apart: the eye is the only door, and the focus alone — a click, a
     * tab stop on the dots — says nothing about what the value is. A focus that leaves the
     * cell hides it again.
     */
    it('reveals through its eye alone, and hides again when the focus leaves the cell', () => {
        mount(undefined, { lines: SECRET, secretable: true, variables: false });

        const value = valueOfRow();

        value.focus();
        expect(value).toHaveTextContent('••••••••••••••');

        fireEvent.click(screen.getByRole('button', { name: 'Revelar valor' }));

        expect(valueOfRow()).toHaveTextContent('hx7_qW2mRt9vL4pX');

        fireEvent.focusOut(valueOfRow());

        expect(valueOfRow()).toHaveTextContent('••••••••••••••');
    });

    it('writes what the revealed value says, keeping the mark', () => {
        const onLinesChange = vi.fn();

        mount(onLinesChange, { lines: SECRET, secretable: true, variables: false });

        fireEvent.click(screen.getByRole('button', { name: 'Revelar valor' }));

        const value = valueOfRow();

        value.textContent = 'rotado_abc';
        fireEvent.input(value);

        expect(onLinesChange).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ id: '0', secret: true, value: 'rotado_abc' }),
            ]),
        );
    });

    it('declares and takes out the mark from the actions of the row', () => {
        const onLinesChange = vi.fn();

        mount(onLinesChange, { lines: SECRET, secretable: true, variables: false });

        fireEvent.click(screen.getByRole('button', { name: 'Variable secreta' }));

        expect(onLinesChange).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ id: '0', secret: false })]),
        );
    });

    it('offers neither badge nor eye to a line that carries no mark', () => {
        const lines: KeyValueLine[] = [
            { disabled: false, id: '0', name: 'base_url', value: 'http://localhost:81' },
        ];

        mount(undefined, { lines, secretable: true, variables: false });

        expect(screen.queryByText('secreta')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Revelar valor' })).not.toBeInTheDocument();
    });

    it('declares the mark on a plain line from its actions', () => {
        const onLinesChange = vi.fn();
        const lines: KeyValueLine[] = [
            { disabled: false, id: '0', name: 'base_url', value: 'http://localhost:81' },
        ];

        mount(onLinesChange, { lines, secretable: true, variables: false });

        fireEvent.click(screen.getByRole('button', { name: 'Variable secreta' }));

        expect(onLinesChange).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ id: '0', secret: true })]),
        );
    });

    it('speaks literal values when the table was told not to speak variables', () => {
        const lines: KeyValueLine[] = [
            { disabled: false, id: '0', name: 'base_url', value: '{{otra}}' },
        ];

        mount(undefined, { lines, secretable: true, variables: false });

        expect(valueOfRow()).toHaveTextContent('{{otra}}');
    });
});
