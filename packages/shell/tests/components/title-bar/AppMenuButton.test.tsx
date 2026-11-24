import { success } from '@mandor/ipc';
import { windowBridge } from '@mandor/ipc/testing';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppMenuButton } from '../../../src/components/title-bar/AppMenuButton.js';

function renderButton(options: { mac?: boolean } = {}) {
    const popupAppMenu = vi
        .spyOn(windowBridge().window, 'popupAppMenu')
        .mockResolvedValue(success({}));

    if (options.mac === true) {
        Object.defineProperty(window.navigator, 'userAgent', {
            configurable: true,
            value: 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15',
        });
    }

    const view = render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <AppMenuButton />
            </TooltipProvider>
        </MessagesProvider>,
    );

    return { popupAppMenu, view };
}

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    vi.restoreAllMocks();
});

describe('the application menu button of the title row', () => {
    it('opens the menu from its own lower left corner', () => {
        const { popupAppMenu } = renderButton();
        const button = screen.getByRole('button', { name: 'Menú de la aplicación' });

        button.getBoundingClientRect = () =>
            ({ bottom: 39, height: 28, left: 12, right: 40, top: 11, width: 28 }) as DOMRect;
        fireEvent.click(button);

        expect(popupAppMenu).toHaveBeenCalledOnce();
        expect(popupAppMenu).toHaveBeenCalledWith({ x: 12, y: 39 });
    });

    it('stays out of the way on macOS, where the menu bar is the system menu', () => {
        const { view } = renderButton({ mac: true });

        expect(view.container.querySelector('button')).toBeNull();
    });
});
