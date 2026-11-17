import type { Environment } from '@mandor/schema';
import { caretOffsetIn } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VariableInput } from '../src/components/field/VariableInput.js';
import { ENVIRONMENT, Field, show, tokenOf, Wrapper, write } from './support/variable-field.js';

// SuggestionsPopover.tsx, through the field like every consumer.
afterEach(cleanup);

describe('the variable input', () => {
    it('paints the tone every variable earns while it is edited', () => {
        const textbox = show('wss://{{baseUrl}}/ws?={{nobody}}');
        const tokens = [...textbox.querySelectorAll<HTMLElement>('[data-part="variable-token"]')];

        expect(tokens.map((token) => token.dataset['variable'])).toEqual(['baseUrl', 'nobody']);
        expect(tokens.map((token) => token.dataset['tone'])).toEqual(['resolved', 'missing']);
    });

    it('suggests the declared names while a name is being written', async () => {
        write(show('wss://'), 'wss://{{');

        expect(await screen.findByRole('listbox')).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /^baseUrl/ })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /^deviceType/ })).toBeInTheDocument();
    });

    it('narrows the suggestions to what the name written so far matches', async () => {
        write(show('wss://'), 'wss://{{de');

        expect(await screen.findByRole('option', { name: /^deviceType/ })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: /^baseUrl/ })).toBeNull();
    });

    it('closes the open braces with the highlighted name on Enter', async () => {
        const textbox = show('wss://');

        write(textbox, 'wss://{{');
        await screen.findByRole('listbox');
        fireEvent.keyDown(textbox, { key: 'ArrowDown' });
        fireEvent.keyDown(textbox, { key: 'Enter' });

        expect(textbox.textContent).toBe('wss://{{deviceType}}');
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('hides the suggestions on Escape', async () => {
        const textbox = show('wss://');

        write(textbox, 'wss://{{');
        await screen.findByRole('listbox');
        fireEvent.keyDown(textbox, { key: 'Escape' });

        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('opens the popover of the variable under the pointer', async () => {
        fireEvent.pointerOver(tokenOf(show('wss://{{baseUrl}}/ws'), 'baseUrl'));

        expect(await screen.findByRole('dialog', { name: '{{baseUrl}}' })).toBeInTheDocument();
        expect(screen.getByLabelText('Variable value')).toHaveTextContent('http://localhost:81/');
    });

    /** Opening a variable draws its close at once: the field waits for the name inside. */
    it('closes the braces it opens and keeps the caret inside them', () => {
        const textbox = show('ws://');

        write(textbox, 'ws://{{');

        expect(textbox.textContent).toBe('ws://{{}}');
        expect(caretOffsetIn(textbox)).toBe(7);
    });

    it('suggests the name being written inside braces it closed in advance', async () => {
        write(show('wss://'), '{{de');

        expect(await screen.findByRole('option', { name: /^deviceType/ })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: /^baseUrl/ })).toBeNull();
    });

    /**
     * The tones belong to the environment in force, never to the moment the field was
     * painted: switching to an environment that lacks the name turns it red at once, and
     * one that declares it brings the blue back.
     */
    it('repaints every tone when the environment in force changes', () => {
        const elsewhere: Environment = {
            id: 'staging',
            name: 'staging',
            variables: [{ name: 'deviceType', value: '', enabled: true, secret: false }],
        };

        const harness = render(
            <Field environment={ENVIRONMENT} initial="wss://{{baseUrl}}/ws?={{deviceType}}" />,
            { wrapper: Wrapper },
        );

        const tonesOf = () =>
            [
                ...harness
                    .getByRole('textbox', { name: 'URL' })
                    .querySelectorAll<HTMLElement>('[data-part="variable-token"]'),
            ].map((token) => [token.dataset['variable'], token.dataset['tone']]);

        expect(tonesOf()).toEqual([
            ['baseUrl', 'resolved'],
            ['deviceType', 'resolved'],
        ]);

        harness.rerender(
            <Wrapper>
                <Field environment={elsewhere} initial="wss://{{baseUrl}}/ws?={{deviceType}}" />
            </Wrapper>,
        );

        expect(tonesOf()).toEqual([
            ['baseUrl', 'missing'],
            ['deviceType', 'empty'],
        ]);
    });

    it('hands the keys the field leaves alone to its owner', () => {
        const onKeyDown = vi.fn();

        render(
            <VariableInput
                environment={ENVIRONMENT}
                label="URL"
                onChange={() => undefined}
                onKeyDown={onKeyDown}
                onVariablesChange={() => undefined}
                value="wss://"
            />,
            { wrapper: Wrapper },
        );
        fireEvent.keyDown(screen.getByRole('textbox', { name: 'URL' }), {
            ctrlKey: true,
            key: 'Enter',
        });

        expect(onKeyDown).toHaveBeenCalledTimes(1);
    });

    it('keeps every key for the suggestions while their list is open', async () => {
        const onKeyDown = vi.fn();

        function Owned() {
            const [value, setValue] = useState('wss://');

            return (
                <VariableInput
                    environment={ENVIRONMENT}
                    label="URL"
                    onChange={setValue}
                    onKeyDown={onKeyDown}
                    onVariablesChange={() => undefined}
                    value={value}
                />
            );
        }

        render(<Owned />, { wrapper: Wrapper });

        const textbox = screen.getByRole('textbox', { name: 'URL' });

        write(textbox, 'wss://{{');
        await screen.findByRole('listbox');
        fireEvent.keyDown(textbox, { key: 'Enter' });

        expect(onKeyDown).not.toHaveBeenCalled();
    });

    it('paints a disabled field and opens no variable in it', () => {
        render(
            <VariableInput
                disabled
                environment={ENVIRONMENT}
                label="URL"
                onChange={() => undefined}
                onVariablesChange={() => undefined}
                value="wss://{{baseUrl}}/ws"
            />,
            { wrapper: Wrapper },
        );

        const textbox = screen.getByRole('textbox', { name: 'URL' });

        fireEvent.pointerOver(tokenOf(textbox, 'baseUrl'));

        expect(tokenOf(textbox, 'baseUrl').dataset['tone']).toBe('resolved');
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
