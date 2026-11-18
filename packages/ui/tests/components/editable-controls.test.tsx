import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InlineNameInput, Input, Select } from '../../src/index.js';
import { byPart } from '../../src/testing/by-part.js';

describe('the editable control primitives', () => {
    it('pastes only plain text into the textbox', () => {
        const onValueChange = vi.fn();

        render(<Input label="URL" value="" onValueChange={onValueChange} />);

        const textbox = screen.getByRole('textbox', { name: 'URL' });
        const clipboardData = {
            getData: (format: string) => (format === 'text/plain' ? 'gateway' : '<b>gateway</b>'),
        };

        fireEvent.paste(textbox, { clipboardData });

        expect(textbox).toHaveTextContent('gateway');
        expect(onValueChange).toHaveBeenLastCalledWith('gateway');
        expect(document.querySelector('input')).toBeNull();
    });

    it('keeps the focused DOM draft and focuses from the frame', () => {
        const onValueChange = vi.fn();
        const { rerender } = render(
            <Input label="URL" value="wss://local" onValueChange={onValueChange} />,
        );
        const textbox = screen.getByRole('textbox', { name: 'URL' });
        const frame = textbox.parentElement;

        if (frame === null) {
            throw new Error('Input frame is missing');
        }

        fireEvent.click(frame);
        expect(textbox).toHaveFocus();

        textbox.textContent = 'wss://draft';
        fireEvent.input(textbox);
        rerender(<Input label="URL" value="wss://external" onValueChange={onValueChange} />);

        expect(textbox).toHaveTextContent('wss://draft');
    });

    /** The placeholder paints on `:empty`: a cleared field must come back childless. */
    it('hands the field back empty when its text is emptied', () => {
        const { rerender } = render(<Input label="URL" value="gateway" onValueChange={vi.fn()} />);

        rerender(<Input label="URL" value="" onValueChange={vi.fn()} />);

        expect(screen.getByRole('textbox', { name: 'URL' }).childNodes.length).toBe(0);
    });

    it('paints supplied variable segments without changing their text', () => {
        render(
            <Input
                label="URL"
                value="{{base_url}}/events"
                onValueChange={vi.fn()}
                segments={[
                    { text: '{{base_url}}', tone: 'resolved', title: 'Entorno local' },
                    { text: '/events' },
                ]}
            />,
        );

        const textbox = screen.getByRole('textbox', { name: 'URL' });

        expect(textbox).toHaveTextContent('{{base_url}}/events');
        expect(byPart('variable-token', textbox)).toHaveTextContent('{{base_url}}');
    });

    it('hands the keys the line receives to its owner', () => {
        const onKeyDown = vi.fn();

        render(<Input label="URL" onKeyDown={onKeyDown} onValueChange={vi.fn()} value="" />);

        fireEvent.keyDown(screen.getByRole('textbox', { name: 'URL' }), { key: 'ArrowDown' });

        expect(onKeyDown).toHaveBeenCalledWith(expect.objectContaining({ key: 'ArrowDown' }));
    });

    it('uses a Radix combobox without a native select', () => {
        render(
            <Select
                label="Formato"
                value="json"
                onValueChange={vi.fn()}
                options={[
                    { value: 'json', label: 'JSON' },
                    { value: 'text', label: 'Texto' },
                ]}
            />,
        );

        const combobox = screen.getByRole('combobox', { name: 'Formato' });

        expect(combobox).toHaveTextContent('JSON');
        expect(combobox.querySelector('svg')).toHaveAttribute('width', '14');
        expect(document.querySelector('select')).toBeNull();
    });

    it('commits an inline name with Enter', () => {
        const onCommit = vi.fn(() => true);

        render(
            <InlineNameInput
                label="Nombre"
                value="gateway"
                onCancel={vi.fn()}
                onCommit={onCommit}
            />,
        );

        fireEvent.keyDown(screen.getByRole('textbox', { name: 'Nombre' }), { key: 'Enter' });

        expect(onCommit).toHaveBeenCalledWith('gateway');
    });

    /** The field sits inside a row that answers to the pointer; editing the name is not a press. */
    it('keeps the clicks inside an inline name to the field', () => {
        const onPress = vi.fn();

        render(
            <div onClick={onPress} onDoubleClick={onPress}>
                <InlineNameInput
                    label="Nombre"
                    value="gateway"
                    onCancel={vi.fn()}
                    onCommit={vi.fn(() => true)}
                />
            </div>,
        );

        fireEvent.click(screen.getByRole('textbox', { name: 'Nombre' }));
        fireEvent.doubleClick(screen.getByRole('textbox', { name: 'Nombre' }));

        expect(onPress).not.toHaveBeenCalled();
    });

    it('lets the owner take a paste, and then inserts nothing', () => {
        const onValueChange = vi.fn();
        const onPasteText = vi.fn(() => true);

        render(
            <Input label="URL" value="" onValueChange={onValueChange} onPasteText={onPasteText} />,
        );

        const textbox = screen.getByRole('textbox', { name: 'URL' });

        fireEvent.paste(textbox, { clipboardData: { getData: () => 'curl https://x' } });

        expect(onPasteText).toHaveBeenCalledWith('curl https://x');
        expect(textbox).toHaveTextContent('');
        expect(onValueChange).not.toHaveBeenCalled();
    });

    it('shows what the owner made of a paste it took while the line holds the focus', () => {
        const onValueChange = vi.fn();
        const { rerender } = render(
            <Input label="URL" value="" onValueChange={onValueChange} onPasteText={() => true} />,
        );
        const textbox = screen.getByRole('textbox', { name: 'URL' });

        fireEvent.focus(textbox);
        fireEvent.paste(textbox, { clipboardData: { getData: () => 'curl https://x' } });
        rerender(
            <Input
                label="URL"
                value="https://x"
                onValueChange={onValueChange}
                onPasteText={() => true}
            />,
        );

        expect(textbox).toHaveTextContent('https://x');

        fireEvent.blur(textbox);

        expect(onValueChange).not.toHaveBeenCalledWith('');
    });

    it('still keeps a draft from an outside write after a paste it took', () => {
        const onValueChange = vi.fn();
        const { rerender } = render(
            <Input label="URL" value="" onValueChange={onValueChange} onPasteText={() => true} />,
        );
        const textbox = screen.getByRole('textbox', { name: 'URL' });

        fireEvent.focus(textbox);
        fireEvent.paste(textbox, { clipboardData: { getData: () => 'curl https://x' } });
        textbox.textContent = 'typed';
        fireEvent.input(textbox);
        rerender(
            <Input
                label="URL"
                value="https://x"
                onValueChange={onValueChange}
                onPasteText={() => true}
            />,
        );

        expect(textbox).toHaveTextContent('typed');
    });

    it('inserts the paste as always when the owner leaves it', () => {
        const onValueChange = vi.fn();

        render(
            <Input label="URL" value="" onValueChange={onValueChange} onPasteText={() => false} />,
        );

        const textbox = screen.getByRole('textbox', { name: 'URL' });

        fireEvent.paste(textbox, { clipboardData: { getData: () => 'gateway' } });

        expect(textbox).toHaveTextContent('gateway');
        expect(onValueChange).toHaveBeenLastCalledWith('gateway');
    });
});
