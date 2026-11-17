import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { allByPart, byPart } from '@mandor/ui/testing';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Sidebar, setSidebarSearchQuery, shellStore } from '../../../src/index.js';
import {
    SIDEBAR_SEARCH_ID,
    sidebarSearchDeclarations,
} from '../../../src/search/sidebar-search-registry.js';
import { mountSidebarSearch, mountSidebarSection } from '../../support/mount-sidebar.js';

const cleanups: (() => void)[] = [];

const SEARCH = {
    field: <p>the field</p>,
    results: <p>results</p>,
    minimumQuery: 2,
    owner: 'a test',
};

function keep(cleanup: () => void): void {
    cleanups.push(cleanup);
}

function sidebar() {
    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <Sidebar />
            </TooltipProvider>
        </MessagesProvider>
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

describe('the sidebar', () => {
    it('draws the sections and no header band while nobody searches', () => {
        keep(
            mountSidebarSection({
                id: 'docs',
                order: 10,
                body: <span>guía</span>,
                title: 'shell:commandPalette',
            }),
        );
        render(sidebar());

        expect(allByPart('sidebar-header')).toEqual([]);
        expect(screen.getByText('guía')).toBeVisible();
    });

    /** The header is a fixed place above the body, so the field never folds away. */
    it('draws the declared field above the sections', () => {
        keep(
            mountSidebarSection({
                id: 'docs',
                order: 10,
                body: <span>guía</span>,
                title: 'shell:commandPalette',
            }),
        );
        keep(mountSidebarSearch(SEARCH));
        render(sidebar());

        const header = byPart('sidebar-header');

        expect(header).toHaveTextContent('the field');
        expect(
            header.compareDocumentPosition(screen.getByText('guía')) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).not.toBe(0);
    });

    it('hands the body to the results while the query carries, and back on empty', () => {
        keep(
            mountSidebarSection({
                id: 'docs',
                order: 10,
                body: <span>guía</span>,
                title: 'shell:commandPalette',
            }),
        );
        keep(mountSidebarSearch(SEARCH));
        render(sidebar());
        act(() => {
            setSidebarSearchQuery('pe');
        });

        expect(screen.getByText('results')).toBeVisible();
        expect(screen.queryByText('guía')).toBeNull();

        act(() => {
            setSidebarSearchQuery('');
        });

        expect(screen.queryByText('results')).toBeNull();
        expect(screen.getByText('guía')).toBeVisible();
    });

    it('keeps one letter from taking the body, like the minimum the searcher asked for', () => {
        keep(mountSidebarSearch(SEARCH));
        render(sidebar());
        act(() => {
            setSidebarSearchQuery('p');
        });

        expect(screen.queryByText('results')).toBeNull();
    });

    it('takes the searcher away without breaking the sections', () => {
        keep(
            mountSidebarSection({
                id: 'docs',
                order: 10,
                body: <span>guía</span>,
                title: 'shell:commandPalette',
            }),
        );
        const view = render(sidebar());
        const stop = mountSidebarSearch(SEARCH);

        stop();
        view.rerender(sidebar());

        expect(sidebarSearchDeclarations.get(SIDEBAR_SEARCH_ID)).toBeUndefined();
        expect(allByPart('sidebar-header')).toEqual([]);
        expect(screen.getByText('guía')).toBeVisible();
    });
});
