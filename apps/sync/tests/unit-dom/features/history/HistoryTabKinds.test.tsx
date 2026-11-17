import type { HistoryAppendedPush } from '@mandor/ipc';
import {
    availableCommands,
    registeredCommands,
    selectTabs,
    shellStore,
    tabKind,
    windowSurface,
} from '@mandor/shell';
import { DrawnTabPart, translatorIn } from '@mandor/shell/testing/tab-kind';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { historyStore } from '../../../../src/renderer/features/history/history-store.js';
import { HistoryTabKinds } from '../../../../src/renderer/features/history/HistoryTabKinds.js';
import { diffResource } from '../../../../src/renderer/features/history/lib/history-resource.js';
import { selectHistoryFor } from '../../../../src/renderer/features/history/select-history-for.js';
import { AppProviders } from '../../support/app-providers.js';
import { ID_A, ID_B, summaryOf } from '../../support/history-fixture.js';

let unregister: (() => void) | undefined;

afterEach(() => {
    cleanup();
    unregister?.();
    unregister = undefined;
    shellStore.getState().reset();
    historyStore.getState().reset();
    vi.restoreAllMocks();
});

function commandOpen(): boolean {
    return availableCommands(shellStore.getState()).some(({ id }) => id === 'history.open');
}

describe('teaching the window what the history is', () => {
    it('registers the tab kind, closable, and takes it away with the baja', () => {
        unregister = render(<HistoryTabKinds />).unmount;

        expect(tabKind('history')?.closable).toBe(true);

        unregister();
        unregister = undefined;

        expect(tabKind('history')).toBeUndefined();
        expect(windowSurface('history')).toBeUndefined();
        expect(registeredCommands().some(({ id }) => id === 'history.open')).toBe(false);
    });

    it('draws the history of the workspace in the resource of the tab', async () => {
        unregister = render(<HistoryTabKinds />).unmount;

        render(
            <AppProviders>
                <DrawnTabPart
                    kind="history"
                    resource="mandor://local/demo/history/all"
                    tabId="history-demo"
                />
            </AppProviders>,
        );

        expect(await screen.findByText('Nothing sent yet')).toBeVisible();
    });

    it('draws nothing for a resource of the history that is not the list', () => {
        unregister = render(<HistoryTabKinds />).unmount;

        const { container } = render(
            <DrawnTabPart
                kind="history"
                resource="mandor://local/demo/item/orders/list"
                tabId="x"
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('registers the comparison tab, draws it from its resource and titles it', () => {
        unregister = render(<HistoryTabKinds />).unmount;

        const resource = diffResource('local', 'demo', ID_A, ID_B);

        expect(tabKind('history-diff')?.closable).toBe(true);
        expect(tabKind('history-diff')?.title(resource, translatorIn())).toBe('Comparison');

        const wrong = render(
            <DrawnTabPart
                kind="history-diff"
                resource="mandor://local/demo/history/all"
                tabId="x"
            />,
        );

        expect(wrong.container).toBeEmptyDOMElement();
        wrong.unmount();

        const drawn = render(
            <AppProviders>
                <DrawnTabPart kind="history-diff" resource={resource} tabId="x" />
            </AppProviders>,
        );

        expect(drawn.container).not.toBeEmptyDOMElement();
        drawn.unmount();

        unregister();
        unregister = undefined;

        expect(tabKind('history-diff')).toBeUndefined();
    });

    it('titles the tab History, in the language it is asked in', () => {
        const resource = 'mandor://local/demo/history/all';

        unregister = render(<HistoryTabKinds />).unmount;

        expect(tabKind('history')?.title(resource, translatorIn())).toBe('History');
        expect(tabKind('history')?.title(resource, translatorIn('es'))).toBe('Historial');
    });

    it('offers the command only inside a workspace', () => {
        unregister = render(<HistoryTabKinds />).unmount;

        expect(commandOpen()).toBe(false);

        shellStore.getState().setActiveWorkspace('demo');

        expect(commandOpen()).toBe(true);
    });

    it('opens the history of the active workspace as a tab, once, from the surface', () => {
        unregister = render(<HistoryTabKinds />).unmount;
        shellStore.getState().setActiveWorkspace('demo');

        windowSurface('history')?.open(shellStore.getState());
        windowSurface('history')?.open(shellStore.getState());

        const tabs = selectTabs(shellStore.getState()).filter((tab) => tab.kind === 'history');

        expect(tabs).toHaveLength(1);
        expect(tabs[0]?.id).toBe('history-demo');
    });

    it('opens nothing from the surface without a workspace', () => {
        unregister = render(<HistoryTabKinds />).unmount;

        windowSurface('history')?.open(shellStore.getState());

        expect(selectTabs(shellStore.getState()).some((tab) => tab.kind === 'history')).toBe(false);
    });

    it('files a pushed send into its workspace, and stops listening with the baja', () => {
        let push: (value: HistoryAppendedPush) => void = () => undefined;
        const off = vi.fn();

        vi.spyOn(syncBridge.history, 'onAppended').mockImplementation((handler) => {
            push = handler;

            return off;
        });

        unregister = render(<HistoryTabKinds />).unmount;
        push({ removed: [], summary: summaryOf(ID_A), workspaceId: 'demo' });
        push({ removed: [ID_A], summary: summaryOf(ID_B), workspaceId: 'demo' });

        expect(
            selectHistoryFor('demo')(historyStore.getState()).summaries.map((each) => each.id),
        ).toEqual([ID_B]);

        unregister();
        unregister = undefined;

        expect(off).toHaveBeenCalledOnce();
    });
});
