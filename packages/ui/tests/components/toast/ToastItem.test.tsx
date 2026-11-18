import { fireEvent, render, screen } from '@testing-library/react';
import { Toast } from 'radix-ui';
import { describe, expect, it, vi } from 'vitest';

import { ToastItem } from '../../../src/components/toast/ToastItem.js';
import { TooltipProvider } from '../../../src/index.js';
import type { ToastSpec } from '../../../src/lib/toast-queue.js';
import { byPart } from '../../../src/testing/by-part.js';

function spec(overrides: Partial<ToastSpec> = {}): ToastSpec {
    return {
        count: 1,
        id: 'toast-1',
        key: 'info:Saved',
        title: 'Saved',
        tone: 'info',
        ...overrides,
    };
}

function draw(toast: ToastSpec, onDismiss = vi.fn()) {
    render(
        <TooltipProvider>
            <Toast.Provider>
                <ToastItem closeLabel="Close" onDismiss={onDismiss} toast={toast} />
                <Toast.Viewport />
            </Toast.Provider>
        </TooltipProvider>,
    );

    return onDismiss;
}

describe('one floating notice', () => {
    it('says its title and carries its tone', () => {
        draw(spec({ tone: 'warning' }));

        expect(byPart('toast')).toHaveTextContent('Saved');
        expect(byPart('toast')).toHaveAttribute('data-tone', 'warning');
    });

    it('counts a notice that was raised again, and says nothing of one raised once', () => {
        draw(spec({ count: 3 }));

        expect(byPart('toast')).toHaveTextContent('×3');
    });

    it('does not count a notice raised once', () => {
        draw(spec());

        expect(byPart('toast').textContent).not.toContain('×');
    });

    it('shows the detail under the title only when there is one', () => {
        draw(spec({ detail: 'Written to disk' }));

        expect(byPart('toast')).toHaveTextContent('Written to disk');
    });

    it('offers the action and runs it when chosen', () => {
        const onSelect = vi.fn();

        draw(spec({ action: { label: 'Undo', onSelect } }));
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

        expect(onSelect).toHaveBeenCalledOnce();
    });

    it('offers no action when none was given', () => {
        draw(spec());

        expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    });

    it('tells which notice was dismissed when the way out is chosen', () => {
        const onDismiss = draw(spec({ id: 'toast-7' }));

        fireEvent.click(screen.getByRole('button', { name: 'Close' }));

        expect(onDismiss).toHaveBeenCalledWith('toast-7');
    });
});
