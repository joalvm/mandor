import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { byPart } from '@mandor/ui/testing';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Sidebar, setSidebarSearchQuery, shellStore } from '../../../src/index.js';
import { mountSidebarSearch, mountSidebarSection } from '../../support/mount-sidebar.js';

const cleanups: (() => void)[] = [];

function keep(cleanup: () => void): void {
    cleanups.push(cleanup);
}

/** Two sections and a searcher, so the header stands and has something to fold. */
function mountSidebar(onFold?: () => void): void {
    keep(
        mountSidebarSection({
            id: 'docs',
            ...(onFold === undefined ? {} : { onFold }),
            order: 10,
            body: <span>guía</span>,
            title: 'shell:commandPalette',
        }),
    );
    keep(
        mountSidebarSection({
            id: 'connections',
            order: 20,
            body: <span>gateway</span>,
            title: 'shell:listTabs',
        }),
    );
    keep(
        mountSidebarSearch({
            field: <p>the field</p>,
            minimumQuery: 2,
            owner: 'a test',
            results: <p>results</p>,
        }),
    );
    render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <Sidebar />
            </TooltipProvider>
        </MessagesProvider>,
    );
}

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    for (const takeDown of cleanups.splice(0)) {
        takeDown();
    }

    setSidebarSearchQuery('');
    shellStore.getState().reset();
});

describe('the button that folds every section', () => {
    it('stands in the header, after the field', () => {
        mountSidebar();

        const header = byPart('sidebar-header');
        const button = screen.getByRole('button', { name: 'Colapsar secciones' });

        expect(header).toContainElement(button);
        expect(header.lastElementChild).toBe(button);
    });

    it('folds all of them at once and writes it where the session keeps it', () => {
        mountSidebar();

        fireEvent.click(screen.getByRole('button', { name: 'Colapsar secciones' }));

        expect([...shellStore.getState().panels.collapsedSections].sort()).toEqual([
            'connections',
            'docs',
        ]);

        for (const title of ['Paleta de comandos', 'Pestañas abiertas']) {
            expect(screen.getByRole('button', { name: title })).toHaveAttribute(
                'aria-expanded',
                'false',
            );
        }
    });

    /** Each section folds what it holds with it, as it does from its own header. */
    it('asks each section to fold what it holds', () => {
        const onFold = vi.fn();

        mountSidebar(onFold);
        fireEvent.click(screen.getByRole('button', { name: 'Colapsar secciones' }));

        expect(onFold).toHaveBeenCalledTimes(1);
    });
});
