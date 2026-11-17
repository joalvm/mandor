import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';
import type { KeyboardEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { EditableLine } from '../../../src/components/input/EditableLine.js';
import type { InputSegment } from '../../../src/lib/paint-segments.js';
import { byPart } from '../../../src/testing/by-part.js';

type LineProps = {
    activeDescendant?: string;
    controls?: string;
    describedBy?: string;
    disabled?: boolean;
    invalid?: boolean;
    onKeyDown?: (event: KeyboardEvent<HTMLSpanElement>) => void;
    placeholder?: string;
    segments?: readonly InputSegment[];
    value: string;
};

function line({ disabled = false, invalid = false, value, ...overrides }: LineProps) {
    cleanup();

    const onValueChange = vi.fn();

    const view = render(
        <EditableLine
            activeDescendant={overrides.activeDescendant}
            controls={overrides.controls}
            describedBy={overrides.describedBy}
            disabled={disabled}
            invalid={invalid}
            label="URL"
            onValueChange={onValueChange}
            onKeyDown={overrides.onKeyDown}
            placeholder={overrides.placeholder}
            segments={overrides.segments}
            value={value}
        />,
    );

    return { onValueChange, textbox: screen.getByRole('textbox', { name: 'URL' }), view };
}

describe('the line that is edited in place', () => {
    it('shows itself as a textbox and paints the value it was given', () => {
        const { textbox } = line({ value: 'wss://local' });

        expect(textbox).toHaveAttribute('data-part', 'editable');
        expect(textbox).toHaveTextContent('wss://local');
    });

    it('reports what the line received as soon as it is typed', () => {
        const { onValueChange, textbox } = line({ value: '' });

        textbox.textContent = 'gateway';
        fireEvent.input(textbox);

        expect(onValueChange).toHaveBeenLastCalledWith('gateway');
    });

    /**
     * While the field is focused its DOM is the truth: painting over it would eat the draft the
     * user holds, so an external write arriving mid-typing waits for the caret to leave — and
     * the draft, not the write, is what the field commits when it does.
     */
    it('keeps the focused draft instead of repainting an external write over it', () => {
        const { onValueChange, textbox, view } = line({ value: 'wss://local' });

        fireEvent.focus(textbox);
        textbox.textContent = 'wss://draft';
        fireEvent.input(textbox);
        view.rerender(
            <EditableLine
                disabled={false}
                invalid={false}
                label="URL"
                onValueChange={onValueChange}
                value="wss://external"
            />,
        );

        expect(textbox).toHaveTextContent('wss://draft');

        fireEvent.blur(textbox);

        expect(onValueChange).toHaveBeenLastCalledWith('wss://draft');
    });

    it('leaves behind what the owner took and took back, without sending it again', () => {
        const { onValueChange, textbox, view } = line({ value: 'a' });

        function withValue(value: string) {
            return (
                <EditableLine
                    disabled={false}
                    invalid={false}
                    label="URL"
                    onValueChange={onValueChange}
                    value={value}
                />
            );
        }

        fireEvent.focus(textbox);
        textbox.textContent = 'refused';
        fireEvent.input(textbox);
        view.rerender(withValue('refused'));
        view.rerender(withValue('a'));

        expect(textbox).toHaveTextContent('refused');

        onValueChange.mockClear();
        fireEvent.blur(textbox);

        expect(onValueChange).not.toHaveBeenCalled();
        expect(textbox).toHaveTextContent('a');
    });

    it('sends what is typed after a refusal, which is a new edit', () => {
        const { onValueChange, textbox, view } = line({ value: 'a' });

        function withValue(value: string) {
            return (
                <EditableLine
                    disabled={false}
                    invalid={false}
                    label="URL"
                    onValueChange={onValueChange}
                    value={value}
                />
            );
        }

        fireEvent.focus(textbox);
        textbox.textContent = 'refused';
        fireEvent.input(textbox);
        view.rerender(withValue('refused'));
        view.rerender(withValue('a'));
        textbox.textContent = 'refused again';
        fireEvent.input(textbox);
        fireEvent.blur(textbox);

        expect(onValueChange).toHaveBeenLastCalledWith('refused again');
    });

    /**
     * A composition is the user writing too: the paint waits until it closes, and then the field
     * takes what the user holds.
     */
    it('waits with the paint while a composition is open, and commits when it closes', () => {
        const { onValueChange, textbox, view } = line({ value: 'gateway' });

        fireEvent.compositionStart(textbox);
        textbox.textContent = 'pasarela';
        view.rerender(
            <EditableLine
                disabled={false}
                invalid={false}
                label="URL"
                onValueChange={onValueChange}
                value="escrito"
            />,
        );

        expect(textbox).toHaveTextContent('pasarela');

        fireEvent.compositionEnd(textbox);

        expect(onValueChange).toHaveBeenLastCalledWith('pasarela');

        view.rerender(
            <EditableLine
                disabled={false}
                invalid={false}
                label="URL"
                onValueChange={onValueChange}
                value="escrito"
            />,
        );

        expect(textbox).toHaveTextContent('escrito');
    });

    it('sinks the default of Enter, so a form around the line never submits', () => {
        const { textbox } = line({ value: '' });

        const event = createEvent.keyDown(textbox, { code: 'Enter', key: 'Enter' });

        fireEvent(textbox, event);

        expect(event.defaultPrevented).toBe(true);
    });

    it('keeps its keys from reaching whatever listens above the line', () => {
        const above = vi.fn();

        document.addEventListener('keydown', above);

        const { textbox } = line({ value: '' });

        fireEvent.keyDown(textbox, { code: 'KeyA', key: 'a' });

        expect(above).not.toHaveBeenCalled();

        document.removeEventListener('keydown', above);
    });

    it('hands the keys it does not keep to its owner', () => {
        const onKeyDown = vi.fn();

        const { textbox } = line({ onKeyDown, value: '' });

        fireEvent.keyDown(textbox, { code: 'ArrowDown', key: 'ArrowDown' });

        expect(onKeyDown).toHaveBeenCalledWith(expect.objectContaining({ key: 'ArrowDown' }));
    });

    it('pastes plain text and nothing else', () => {
        const { onValueChange, textbox } = line({ value: '' });

        const clipboardData = {
            getData: (format: string) => (format === 'text/plain' ? 'gateway' : '<b>gateway</b>'),
        };

        fireEvent.paste(textbox, { clipboardData });

        expect(textbox).toHaveTextContent('gateway');
        expect(onValueChange).toHaveBeenLastCalledWith('gateway');
        expect(textbox.querySelector('b')).toBeNull();
    });

    it('paints the variable tokens it was given without changing their text', () => {
        const { textbox } = line({
            segments: [
                { text: '{{base_url}}', title: 'Entorno local', tone: 'resolved' },
                { text: '/events' },
            ],
            value: '{{base_url}}/events',
        });

        expect(textbox).toHaveTextContent('{{base_url}}/events');
        expect(byPart('variable-token', textbox)).toHaveTextContent('{{base_url}}');
    });

    it('stays out of the caret while disabled, and takes it by tab when it is not', () => {
        const { textbox } = line({ disabled: true, value: 'wss://local' });

        expect(textbox).toHaveAttribute('aria-disabled', 'true');
        expect(textbox).toHaveAttribute('contenteditable', 'false');
        expect(textbox).toHaveAttribute('tabindex', '-1');

        const enabled = line({ value: '' }).textbox;

        expect(enabled).toHaveAttribute('contenteditable', 'plaintext-only');
        expect(enabled).toHaveAttribute('tabindex', '0');
    });

    it('carries the wiring a field hands it and holds the placeholder where style finds it', () => {
        const { textbox } = line({ describedBy: 'url-help', invalid: true, value: '' });

        expect(textbox).toHaveAttribute('aria-invalid', 'true');
        expect(textbox).toHaveAttribute('aria-describedby', 'url-help');

        const empty = line({ placeholder: 'wss://host', value: '' }).textbox;

        expect(empty).toHaveAttribute('data-placeholder', 'wss://host');
        expect(empty.childNodes.length).toBe(0);
    });

    /** The focus stays in the line while a list is walked: the line says which option it is on. */
    it('points at the option of the list it walks, from where the focus stays', () => {
        const { textbox } = line({ activeDescendant: 'row-2', controls: 'list-1', value: '' });

        expect(textbox).toHaveAttribute('aria-activedescendant', 'row-2');
        expect(textbox).toHaveAttribute('aria-controls', 'list-1');

        const alone = line({ value: '' }).textbox;

        expect(alone).not.toHaveAttribute('aria-activedescendant');
        expect(alone).not.toHaveAttribute('aria-controls');
    });
});
