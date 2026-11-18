import { MessagesProvider } from '@mandor/i18n';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { GroupGrid, shellStore, useTab } from '@mandor/shell';
import { declareTabKindSpec } from '@mandor/shell/testing/tab-kind';
import { dragTabOnto } from '@mandor/shell/testing';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { activityStore } from '../../../../src/renderer/activity/activity-store.js';
import { selectActivityFor } from '../../../../src/renderer/activity/select-activity-for.js';
import {
    connectionsStore,
    ConnectionTabKind,
} from '../../../../src/renderer/features/connections/index.js';
import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import { messageEntry } from '../../../../src/renderer/features/connections/lib/connection-message-entry.js';

function ShownResource() {
    return <p>{`Contenido de ${useTab().resource}`}</p>;
}

const UNREGISTER: (() => void)[] = [];
const RESOURCE = 'mandor://demo/payments/connection/alpha';
const RECORDS = [
    { at: 1, data: 'hola', direction: 'in' as const },
    { at: 2, data: 'adiós', direction: 'out' as const },
    { at: 3, data: 'otra vez', direction: 'in' as const },
];

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <ToastProvider messages={{ close: 'Cerrar', more: () => 'Más' }}>
                    {children}
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>
    );
}

/** A live connection on the left, a document on the right, and one drag between the two. */
function scene(): string {
    shellStore.getState().reset();
    shellStore
        .getState()
        .openTab(ROOT_GROUP_ID, { id: 'alpha', kind: 'connection', resource: RESOURCE });

    const right = shellStore.getState().splitGroup(ROOT_GROUP_ID, 'row');

    shellStore.getState().openTab(right, {
        id: 'one',
        kind: 'doc',
        resource: 'mandor://demo/payments/doc/one.md',
    });

    return right;
}

function draw() {
    return render(<GroupGrid />, { wrapper: Wrapper });
}

beforeEach(() => {
    activityStore.getState().reset();
    connectionsStore.getState().reset();
    connectionsStore.getState().upsertConnection({
        id: 'alpha',
        name: 'Gateway',
        transport: 'websocket',
        url: 'wss://example.test/socket',
        headers: [],
        environmentId: null,
    });
    UNREGISTER.push(
        render(<ConnectionTabKind />, { wrapper: Wrapper }).unmount,
        declareTabKindSpec({
            id: 'doc',
            closable: true,
            icon: 'file',
            body: <ShownResource />,
            title: (resource) => resource.slice(resource.lastIndexOf('/') + 1),
        }),
    );
});

afterEach(() => {
    // The window comes down before its kinds do: a tab left drawn over a kind that is no
    // longer registered has nothing to render itself with.
    cleanup();

    for (const unregister of UNREGISTER.splice(0)) {
        unregister();
    }

    shellStore.getState().reset();
});

describe('a live connection dragged to another group', () => {
    it('lands in the group it was dropped on with its activity, and opens no second socket', async () => {
        const open = vi.spyOn(asyncBridge.ws, 'open');
        const right = scene();

        act(() => {
            connectionsStore.getState().setConnectionState('alpha', 'open');
            activityStore.getState().appendActivity(
                RESOURCE,
                RECORDS.map((record) => messageEntry(record)),
            );
        });

        const buffered = selectActivityFor(RESOURCE)(activityStore.getState());

        const { container } = draw();
        // The trail under the toolbar repeats the name, so the tab is picked among the twins.
        const tab = screen
            .getAllByText('Gateway')
            .map((each) => each.closest('.dv-tab'))
            .find((each) => each !== null);
        const groups = [...container.querySelectorAll('.dv-groupview')];

        await dragTabOnto(tab ?? container, groups[1] ?? container);

        const holder = leavesOf(shellStore.getState().grid).find((leaf) =>
            leaf.tabs.some((tab) => tab.id === 'alpha'),
        );

        expect(holder?.id).toBe(right);
        expect(selectActivityFor(RESOURCE)(activityStore.getState())).toEqual(buffered);
        expect(buffered).toHaveLength(RECORDS.length);
        expect(connectionsStore.getState().states['alpha']).toBe('open');
        expect(open).not.toHaveBeenCalled();
    });
});
