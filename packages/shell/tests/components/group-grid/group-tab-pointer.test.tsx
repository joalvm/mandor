import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { shellStore } from '../../../src/index.js';
import { declareTabKindSpec } from '../../../src/testing/tab-kind.js';
import { TabOf } from '../../../src/testing/tab-strip.js';

/** What the strip was asked to close, the way the grid hears it. */
const closed = vi.fn<(groupId: string, tabId: string) => void>();

let undo: () => void = () => undefined;

function draw(active: boolean): void {
    render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <TabOf
                    active={active}
                    groupId="group"
                    onClose={closed}
                    tab={{
                        id: 'tab',
                        kind: 'sample',
                        resource: 'mandor://demo/payments/connection/tab',
                    }}
                />
            </TooltipProvider>
        </MessagesProvider>,
    );
}

function pill(): Element {
    const head = screen.getByText('First').closest('[data-part="group-tab"]');

    if (head === null) {
        throw new Error('the tab drew no pill');
    }

    return head;
}

beforeEach(() => {
    undo = declareTabKindSpec({
        closable: true,
        icon: 'connection',
        id: 'sample',
        title: () => 'First',
    });
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();
    shellStore.getState().reset();
    closed.mockClear();
    undo();
});

describe('the pointer and the keys on a tab', () => {
    it('closes the tab with a click of the middle button', () => {
        draw(false);
        fireEvent(pill(), new MouseEvent('auxclick', { bubbles: true, button: 1 }));

        expect(closed).toHaveBeenCalledWith('group', 'tab');
    });

    it('keeps the middle button from starting the scroll of the window', () => {
        draw(false);

        const press = new MouseEvent('mousedown', { bubbles: true, button: 1, cancelable: true });

        fireEvent(pill(), press);

        expect(press.defaultPrevented).toBe(true);
        expect(closed).not.toHaveBeenCalled();
    });

    /** Shift+F10 and the menu key fire on the element that holds the focus: the wrapper. */
    it('opens its menu from the keyboard, on the wrapper dockview focuses', async () => {
        draw(true);
        fireEvent.contextMenu(screen.getByRole('tab', { name: 'First' }));

        expect(await screen.findByRole('menu')).toBeVisible();
    });

    it('shows its whole name when pointed at, in the tooltip and not a native title', async () => {
        draw(true);

        const head = screen.getByText('First');

        expect(head).not.toHaveAttribute('title');
        fireEvent.focus(head);

        expect(await screen.findByRole('tooltip')).toHaveTextContent('First');
    });
});
