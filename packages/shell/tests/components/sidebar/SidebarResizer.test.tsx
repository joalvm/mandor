import { MessagesProvider } from '@mandor/i18n';
import { SIDEBAR_WIDTH } from '@mandor/ipc';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { shellStore, SidebarResizer } from '../../../src/index.js';

function sidebarWidth(): number {
    return shellStore.getState().panels.sidebarWidth;
}

afterEach(() => {
    cleanup();
});

describe('the edge of the sidebar', () => {
    it('moves eight pixels an arrow, thirty-two with shift, and no other key moves it', () => {
        shellStore.getState().setPanels({ sidebarWidth: SIDEBAR_WIDTH.default });
        render(
            <MessagesProvider preferences={{ language: 'es' }}>
                <SidebarResizer />
            </MessagesProvider>,
        );

        const edge = screen.getByRole('separator');

        fireEvent.keyDown(edge, { key: 'ArrowRight' });
        expect(sidebarWidth()).toBe(SIDEBAR_WIDTH.default + 8);

        fireEvent.keyDown(edge, { key: 'ArrowLeft', shiftKey: true });
        expect(sidebarWidth()).toBe(SIDEBAR_WIDTH.default - 24);

        fireEvent.keyDown(edge, { key: 'ArrowUp' });
        expect(sidebarWidth()).toBe(SIDEBAR_WIDTH.default - 24);
    });

    it('stays inside the widths the window allows', () => {
        shellStore.getState().setPanels({ sidebarWidth: SIDEBAR_WIDTH.max });
        render(
            <MessagesProvider preferences={{ language: 'es' }}>
                <SidebarResizer />
            </MessagesProvider>,
        );

        fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowRight', shiftKey: true });

        expect(sidebarWidth()).toBe(SIDEBAR_WIDTH.max);
    });
});
