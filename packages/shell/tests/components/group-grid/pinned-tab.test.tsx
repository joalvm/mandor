import { MessagesProvider } from '@mandor/i18n';
import { ROOT_GROUP_ID } from '@mandor/ipc';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isPinnedTab } from '../../../src/grid/leaf-pins.js';
import { shellStore, type Tab } from '../../../src/index.js';
import { declareTabKindSpec } from '../../../src/testing/tab-kind.js';
import { TabOf } from '../../../src/testing/tab-strip.js';

const TAB: Tab = { id: 'tab', kind: 'sample', resource: 'mandor://demo/payments/connection/tab' };

/** What the strip was asked to close, the way the grid hears it. */
const closed = vi.fn<(groupId: string, tabId: string) => void>();

let undo: () => void = () => undefined;

function drawPinned(): void {
    shellStore.getState().openTab(ROOT_GROUP_ID, TAB);
    shellStore.getState().pinTab(TAB.id);
    render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <TabOf active={false} onClose={closed} tab={TAB} />
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
    cleanup();
    shellStore.getState().reset();
    closed.mockClear();
    undo();
});

describe('a pinned tab', () => {
    it('says it is pinned and offers its pin where the close would be', () => {
        drawPinned();

        expect(pill()).toHaveAttribute('data-pinned');
        expect(screen.getByRole('button', { name: 'Soltar pestaña' })).toHaveClass('visible');
        expect(screen.queryByRole('button', { name: 'Cerrar pestaña' })).toBeNull();
    });

    it('lets go of the pin from the pin', () => {
        drawPinned();
        fireEvent.click(screen.getByRole('button', { name: 'Soltar pestaña' }));

        expect(isPinnedTab(shellStore.getState().grid, TAB.id)).toBe(false);
        expect(screen.getByRole('button', { name: 'Cerrar pestaña' })).toBeInTheDocument();
    });

    /** The middle button closes by aim, and a pinned tab is not closed by aim. */
    it('does not close with a click of the middle button', () => {
        drawPinned();
        fireEvent(pill(), new MouseEvent('auxclick', { bubbles: true, button: 1 }));

        expect(closed).not.toHaveBeenCalled();
    });
});
