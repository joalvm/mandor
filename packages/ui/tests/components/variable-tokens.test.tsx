import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Input } from '../../src/index.js';
import { caretOffsetIn } from '../../src/lib/caret-offset.js';
import { byPart } from '../../src/testing/by-part.js';
import { cssOf } from '../styles/theme-values.js';

const URL_SEGMENTS = [
    { text: 'wss://' },
    { text: '{{host}}', tone: 'resolved', name: 'host' },
    { text: '/socket' },
] as const;

describe('the variable tokens of a field', () => {
    it('paints every tone a variable earns, written or still being written', () => {
        render(
            <Input
                label="URL"
                value="{{base_url}}{{draft}}{{empty}}{{gone}}"
                onValueChange={vi.fn()}
                segments={[
                    { text: '{{base_url}}', tone: 'resolved', name: 'base_url' },
                    { text: '{{draft}}', tone: 'open', name: 'draft' },
                    { text: '{{empty}}', tone: 'empty', name: 'empty' },
                    { text: '{{gone}}', tone: 'missing', name: 'gone' },
                ]}
            />,
        );

        const textbox = screen.getByRole('textbox', { name: 'URL' });
        const tones = [
            ...textbox.querySelectorAll<HTMLElement>('[data-part="variable-token"]'),
        ].map((token) => token.dataset['tone']);

        expect(tones).toEqual(['resolved', 'open', 'empty', 'missing']);
    });

    it('repaints the tokens while the field holds the caret', () => {
        const onValueChange = vi.fn();
        const { rerender } = render(
            <Input label="URL" value="wss://{{host}}/socket" onValueChange={onValueChange} />,
        );
        const textbox = screen.getByRole('textbox', { name: 'URL' });

        fireEvent.focus(textbox);
        textbox.textContent = 'wss://{{host}}/socket';
        fireEvent.input(textbox);
        expect(onValueChange).toHaveBeenLastCalledWith('wss://{{host}}/socket');

        rerender(
            <Input
                label="URL"
                value="wss://{{host}}/socket"
                onValueChange={onValueChange}
                segments={URL_SEGMENTS}
            />,
        );

        expect(textbox).toHaveTextContent('wss://{{host}}/socket');
        expect(byPart('variable-token', textbox)).toHaveTextContent('{{host}}');
    });

    it('keeps the caret where the user left it when the tokens repaint', () => {
        const onValueChange = vi.fn();
        const { rerender } = render(
            <Input label="URL" value="wss://{{host}}/socket" onValueChange={onValueChange} />,
        );
        const textbox = screen.getByRole('textbox', { name: 'URL' });

        fireEvent.focus(textbox);
        textbox.textContent = 'wss://{{host}}/socket';

        const plain = document.createTextNode('wss://{{host}}/socket');
        const range = document.createRange();

        range.setStart(plain, 10);
        range.collapse(true);
        textbox.textContent = '';
        textbox.append(plain);
        document.getSelection()?.removeAllRanges();
        document.getSelection()?.addRange(range);
        fireEvent.input(textbox);

        rerender(
            <Input
                label="URL"
                value="wss://{{host}}/socket"
                onValueChange={onValueChange}
                segments={URL_SEGMENTS}
            />,
        );

        expect(document.getSelection()?.getRangeAt(0).collapsed).toBe(true);
        expect(caretOffsetIn(textbox)).toBe(10);
    });

    it('leaves the field unpainted while the composition is open', () => {
        const onValueChange = vi.fn();
        const { rerender } = render(
            <Input
                label="URL"
                value="{{host}}"
                onValueChange={onValueChange}
                segments={[{ text: '{{host}}', tone: 'resolved', name: 'host' }]}
            />,
        );
        const textbox = screen.getByRole('textbox', { name: 'URL' });

        fireEvent.compositionStart(textbox);
        textbox.textContent = '{{host}}x';
        fireEvent.input(textbox);
        rerender(
            <Input
                label="URL"
                value="{{host}}x"
                onValueChange={onValueChange}
                segments={[{ text: '{{host}}x' }]}
            />,
        );

        expect(textbox.querySelectorAll('[data-part="variable-token"]')).toHaveLength(0);
    });

    it('quiets the tokens of a field that is read and not written, and gives them no pointer', async () => {
        render(
            <Input
                disabled
                label="URL"
                onValueChange={vi.fn()}
                segments={URL_SEGMENTS}
                value="wss://{{host}}/socket"
            />,
        );

        const textbox = screen.getByRole('textbox', { name: 'URL' });
        const css = await cssOf('runtime.css');

        expect(textbox).toHaveAttribute('aria-disabled', 'true');
        expect(textbox.querySelector('[data-part="variable-token"]')).not.toBeNull();
        expect(css).toContain("[aria-disabled='true'] > [data-part='variable-token']");
    });
});
