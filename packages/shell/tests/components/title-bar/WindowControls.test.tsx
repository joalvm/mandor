import { success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { cleanup, act, fireEvent, render, screen } from '@testing-library/react';
import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WindowControls } from '../../../src/components/title-bar/WindowControls.js';

type Mandor = { mandor: FakeBridge };

function mandor(): FakeBridge {
    return (window as unknown as Mandor).mandor;
}

function renderControls(options: { mac?: boolean } = {}) {
    const minimize = vi.spyOn(mandor().window, 'minimize').mockResolvedValue(success({}));
    const toggleMaximize = vi
        .spyOn(mandor().window, 'toggleMaximize')
        .mockResolvedValue(success({}));
    const close = vi.spyOn(mandor().window, 'close').mockResolvedValue(success({}));
    let notify: ((push: { maximized: boolean }) => void) | undefined;
    const stop = vi.fn();

    vi.spyOn(mandor().window, 'onMaximizedChange').mockImplementation((handler) => {
        notify = handler;

        return stop;
    });

    if (options.mac === true) {
        Object.defineProperty(window.navigator, 'userAgent', {
            configurable: true,
            value: 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15',
        });
    }

    const view = render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <WindowControls />
            </TooltipProvider>
        </MessagesProvider>,
    );

    return { close, minimize, notify, stop, toggleMaximize, view };
}

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    vi.restoreAllMocks();
});

describe('the window controls of the title row', () => {
    it('moves the window through its own three buttons', () => {
        const { close, minimize, toggleMaximize } = renderControls();

        fireEvent.click(screen.getByRole('button', { name: 'Minimizar' }));
        fireEvent.click(screen.getByRole('button', { name: 'Maximizar' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar ventana' }));

        expect(minimize).toHaveBeenCalledOnce();
        expect(toggleMaximize).toHaveBeenCalledOnce();
        expect(close).toHaveBeenCalledOnce();
    });

    it('switches the maximize button to restore while the window is maximized', () => {
        const { notify } = renderControls();

        expect(screen.queryByRole('button', { name: 'Restaurar' })).toBeNull();

        act(() => {
            notify?.({ maximized: true });
        });

        expect(screen.getByRole('button', { name: 'Restaurar' })).toBeDefined();
        expect(screen.queryByRole('button', { name: 'Maximizar' })).toBeNull();
    });

    it('stops listening when it goes away', () => {
        const { notify, stop, view } = renderControls();

        act(() => {
            notify?.({ maximized: true });
        });
        view.unmount();
        act(() => {
            notify?.({ maximized: false });
        });

        expect(stop).toHaveBeenCalledOnce();
    });

    it('leaves the controls to the system on macOS', () => {
        const { view } = renderControls({ mac: true });

        expect(view.container.querySelector('[data-part="window-controls"]')).toBeNull();
    });
});
