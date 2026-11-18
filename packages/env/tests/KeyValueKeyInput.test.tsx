import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { KeyValueKeyInput } from '../src/components/key-value/KeyValueKeyInput.js';
import { mountInTable } from './support/key-value-state.js';

afterEach(cleanup);

const NAMES = ['Accept', 'Accept-Encoding', 'User-Agent'];

function draw(value: string, names?: readonly string[], invalid?: boolean) {
    const onValueChange = vi.fn();

    mountInTable(
        <KeyValueKeyInput
            invalid={invalid}
            label="Clave"
            onValueChange={onValueChange}
            value={value}
        />,
        { keySuggestions: names },
    );

    return { key: screen.getByRole('textbox', { name: 'Clave' }), onValueChange };
}

describe('the key cell of a row', () => {
    it('is a plain field that speaks its value when the table gives no names', () => {
        const { key } = draw('acc');

        fireEvent.focus(key);

        expect(key).toHaveTextContent('acc');
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('hands what is written to its owner', () => {
        const { key, onValueChange } = draw('');

        fireEvent.focus(key);
        key.textContent = 'X-Trace';
        fireEvent.input(key);

        expect(onValueChange).toHaveBeenCalledWith('X-Trace');
    });

    it('hangs the names that still fit from the cell while it holds the focus', async () => {
        const { key } = draw('acc', NAMES);

        expect(screen.queryByRole('option')).toBeNull();

        fireEvent.focus(key);

        await screen.findByRole('option', { name: 'Accept' });
        expect(screen.getByRole('option', { name: 'Accept-Encoding' })).toBeVisible();
        expect(screen.queryByRole('option', { name: 'User-Agent' })).toBeNull();
    });

    it('takes the list away when the focus leaves', async () => {
        const { key } = draw('acc', NAMES);

        fireEvent.focus(key);
        await screen.findByRole('option', { name: 'Accept' });

        fireEvent.blur(key);

        await waitFor(() => {
            expect(screen.queryByRole('option')).toBeNull();
        });
    });

    it('walks the list with the keyboard and settles the name with Enter', async () => {
        const { key, onValueChange } = draw('acc', NAMES);

        fireEvent.focus(key);
        await screen.findByRole('option', { name: 'Accept' });

        fireEvent.keyDown(key, { key: 'ArrowDown' });
        fireEvent.keyDown(key, { key: 'Enter' });

        expect(onValueChange).toHaveBeenCalledWith('Accept-Encoding');
    });

    it('sends the list away with Escape', async () => {
        const { key } = draw('acc', NAMES);

        fireEvent.focus(key);
        await screen.findByRole('option', { name: 'Accept' });

        fireEvent.keyDown(key, { key: 'Escape' });

        expect(screen.queryByRole('option')).toBeNull();
    });

    it('wears the error line on a key the list cannot be kept under', () => {
        const { key } = draw('mal', undefined, true);

        expect(key).toBeInvalid();
    });
});
