import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WindowButton } from '../../../src/components/button/WindowButton.js';

describe('the buttons that command the window', () => {
    it('runs its window command behind the label a reader finds it by', () => {
        const onClick = vi.fn();

        render(<WindowButton icon="window-minimize" label="Minimizar" onClick={onClick} />);

        fireEvent.click(screen.getByRole('button', { name: 'Minimizar' }));

        expect(onClick).toHaveBeenCalledOnce();
    });

    it('is a plain button that DevTools can tell apart from every other one', () => {
        render(<WindowButton icon="window-maximize" label="Maximizar" onClick={vi.fn()} />);

        const button = screen.getByRole('button', { name: 'Maximizar' });

        expect(button).toHaveAttribute('data-part', 'window-button');
        expect(button).toHaveAttribute('type', 'button');
        expect(button.querySelector('svg')).not.toBeNull();
    });

    /**
     * Red is a variant and not a colour a caller passes, so the only button that wears it is the
     * one that closes.
     */
    it('reserves the closing colour for the variant that closes, and no other', () => {
        render(
            <>
                <WindowButton
                    icon="window-close"
                    label="Cerrar"
                    onClick={vi.fn()}
                    variant="close"
                />
                <WindowButton icon="window-minimize" label="Minimizar" onClick={vi.fn()} />
            </>,
        );

        const closing = screen.getByRole('button', { name: 'Cerrar' });
        const chrome = screen.getByRole('button', { name: 'Minimizar' });

        expect(closing.className).toContain('hover:bg-surface-window-close-hover');
        expect(chrome.className).not.toContain('hover:bg-surface-window-close-hover');
        expect(chrome.className).toContain('hover:bg-surface-control-hover');
    });
});
