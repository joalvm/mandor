import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { ROOT_GROUP_ID } from '@mandor/ipc';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GroupTab } from '../../../src/components/group-grid/GroupTab.js';
import { GroupGridContext } from '../../../src/grid/group-grid-scope.js';
import { shellStore } from '../../../src/index.js';
import type { TabKindSpec } from '../../../src/tab/tab-kind-registry.js';
import { declareTabKindSpec } from '../../../src/testing/tab-kind.js';

/** The name the kind reads, moved by the test the way a rename moves it in the real kind. */
let name = 'First';
let notify: () => void = () => undefined;

const KIND: TabKindSpec = {
    closable: true,
    icon: 'connection',
    id: 'sample',
    subscribeTitles: (onChange) => {
        notify = onChange;

        return () => {
            notify = () => undefined;
        };
    },
    title: () => name,
};

declareTabKindSpec(KIND);

function draw(stale: string, active: boolean) {
    const api = {
        group: { id: 'group' },
        id: 'tab',
        isActive: active,
        onDidActiveChange: () => ({ dispose: () => undefined }),
        setTitle: vi.fn(function hold(next: string) {
            api.title = next;
        }),
        title: stale,
    };

    render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <GroupGridContext value={{ onCloseTab: () => undefined, resources: {} }}>
                    <GroupTab
                        api={api as unknown as Parameters<typeof GroupTab>[0]['api']}
                        containerApi={
                            {} as unknown as Parameters<typeof GroupTab>[0]['containerApi']
                        }
                        tabLocation={
                            { type: 'dock' } as unknown as Parameters<
                                typeof GroupTab
                            >[0]['tabLocation']
                        }
                        params={{
                            kind: 'sample',
                            resource: 'mandor://demo/payments/connection/tab',
                        }}
                    />
                </GroupGridContext>
            </TooltipProvider>
        </MessagesProvider>,
    );

    return api;
}

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();
    shellStore.getState().reset();

    name = 'First';
    vi.restoreAllMocks();
});

describe('the title the tab says of itself', () => {
    it('hands the wrapper the name it just read, so the two never disagree', () => {
        name = 'Echo';
        const api = draw('New connection', true);

        act(() => {
            notify();
        });

        expect(api.setTitle).toHaveBeenCalledWith('Echo');
        expect(api.title).toBe('Echo');
    });

    it('hands the wrapper the word for untitled while the kind has no name to give', () => {
        name = '';
        const api = draw('mandor://demo/payments/connection/tab', true);

        expect(api.setTitle).toHaveBeenCalledWith('Sin título');
        expect(api.title).toBe('Sin título');
    });

    it('says nothing when the wrapper already agrees', () => {
        name = 'Echo';
        const api = draw('Echo', true);

        act(() => {
            notify();
        });

        expect(api.setTitle).not.toHaveBeenCalled();
        expect(api.title).toBe('Echo');
    });
});

describe('the close of a tab', () => {
    /** jsdom reads no stylesheet, so the state is the class that carries it. */
    function closeState(): string {
        return screen.getByRole('button', { name: 'Cerrar pestaña' }).className;
    }

    /** The tab in front keeps no close at rest either: the strip at rest shows only names. */
    it('waits for a hover, on the tab in front too', () => {
        draw('Echo', true);

        expect(closeState()).toContain('invisible');
    });

    it('waits for a hover on the tabs behind', () => {
        draw('Echo', false);

        expect(closeState()).toContain('invisible');
    });
});

describe('a tab opened only to look at it', () => {
    function look(): void {
        shellStore
            .getState()
            .openTab(
                ROOT_GROUP_ID,
                { id: 'tab', kind: 'sample', resource: 'mandor://demo/payments/connection/tab' },
                { preview: true },
            );
    }

    function pill(): Element {
        const head = screen.getByText('First').closest('[data-part="group-tab"]');

        if (head === null) {
            throw new Error('the tab drew no pill');
        }

        return head;
    }

    it('says so on the pill, for the stylesheet to write it in italics', () => {
        look();
        draw('First', true);

        expect(pill()).toHaveAttribute('data-preview');
    });

    it('is kept by a double click on it', () => {
        look();
        draw('First', true);
        fireEvent.doubleClick(pill());

        expect(pill()).not.toHaveAttribute('data-preview');
    });

    it('says nothing on a kept tab', () => {
        draw('First', true);

        expect(pill()).not.toHaveAttribute('data-preview');
    });
});
