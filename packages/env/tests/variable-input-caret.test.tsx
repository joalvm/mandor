import { placeCaretAt } from '@mandor/ui';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { show, tokenOf, write } from './support/variable-field.js';

afterEach(cleanup);

describe('a variable input where the caret only lands', () => {
    /**
     * Leaving the field reports its text once more. Read as an edit, a caret left inside a
     * token asked for its name, and the list came up under the panel the click had opened.
     */
    it('suggests nothing when the field is left with the caret inside a variable', () => {
        const textbox = show('wss://{{baseUrl}}/ws');

        fireEvent.focus(textbox);
        placeCaretAt(textbox, 10);
        fireEvent.blur(textbox);

        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('puts the suggestions away when a click moves the caret', async () => {
        const textbox = show('wss://');

        write(textbox, 'wss://{{de');
        await screen.findByRole('listbox');
        placeCaretAt(textbox, 2);
        fireEvent.pointerDown(textbox);

        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('puts the suggestions away when an arrow moves the caret', async () => {
        const textbox = show('wss://');

        write(textbox, 'wss://{{de');
        await screen.findByRole('listbox');
        fireEvent.keyDown(textbox, { key: 'ArrowLeft' });

        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('asks again once the caret writes inside the variable', async () => {
        const textbox = show('wss://{{baseUrl}}/ws');

        fireEvent.pointerDown(textbox);
        write(textbox, 'wss://{{deUrl}}/ws', 10);

        expect(await screen.findByRole('option', { name: /^deviceType/ })).toBeInTheDocument();
    });

    /** Two panels hanging from one token talk over each other: the name being written wins. */
    it('puts the panel of a variable away once a name is being written', async () => {
        const textbox = show('wss://{{baseUrl}}/ws');

        fireEvent.focus(textbox);
        fireEvent.pointerOver(tokenOf(textbox, 'baseUrl'));
        await screen.findByRole('dialog', { name: '{{baseUrl}}' });
        // The focus never leaves the field: the panel came up while the pointer rested on it.
        textbox.textContent = 'wss://{{baseUrl}}/ws?={{de';
        placeCaretAt(textbox, textbox.textContent.length);
        fireEvent.input(textbox);

        expect(await screen.findByRole('listbox')).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
