import { envStore } from '@mandor/env';
import { MessagesProvider } from '@mandor/i18n';
import { ROOT_GROUP_ID } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { createEnvironment } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { allByPart, byPart } from '@mandor/ui/testing';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { cleanup, act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { activityStore } from '../../../../src/renderer/activity/activity-store.js';
import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import { ConnectionPanel } from '../../../../src/renderer/features/connections/components/panel/ConnectionPanel.js';
import {
    connectionsStore,
    ConnectionTabKind,
} from '../../../../src/renderer/features/connections/index.js';
import { openComposerEvent } from './support/open-composer-event.js';

const fakeBridge = asyncBridge as FakeBridge;
const UNREGISTER: (() => void)[] = [];
const RESOURCE = 'mandor://demo/payments/connection/alpha';
/** A frame that never was text: two control bytes and a word after them. */
const BINARY = `${String.fromCodePoint(0, 1)}hola`;

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

function push(data: string, at: number): void {
    act(() => {
        fakeBridge.emitActivity({
            connectionId: 'alpha',
            environmentId: null,
            records: [{ at, data, direction: 'in' }],
        });
    });
}

/** A frame this window sent, with the item it was written in and what the socket opened with. */
function pushOut(origin: string, environmentId: string | null): void {
    act(() => {
        fakeBridge.emitActivity({
            connectionId: 'alpha',
            environmentId,
            records: [{ at: 1700000000000, data: 'hola', direction: 'out', origin }],
        });
    });
}

function rows(): HTMLElement[] {
    return within(screen.getByRole('log', { name: 'Actividad' })).getAllByRole('option');
}

function detail(): HTMLElement | undefined {
    return allByPart('activity-detail')[0];
}

beforeEach(() => {
    openComposerEvent('alpha');
    activityStore.getState().reset();
    envStore.getState().reset();
    envStore.setState({ environments: [createEnvironment({ id: 'local', name: 'Local' })] });
    connectionsStore.getState().reset();
    connectionsStore.getState().upsertConnection({
        id: 'alpha',
        name: 'Gateway',
        transport: 'websocket',
        url: 'wss://example.test/socket',
        headers: [],
        environmentId: null,
    });
    // What main pushes lands on the resource the window has open, so the window has it open.
    shellStore.getState().openTab(ROOT_GROUP_ID, {
        id: 'alpha',
        kind: 'connection',
        resource: RESOURCE,
    });

    UNREGISTER.push(render(<ConnectionTabKind />, { wrapper: Wrapper }).unmount);

    render(<ConnectionPanel connectionId="alpha" resource={RESOURCE} />, {
        wrapper: Wrapper,
    });
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    vi.restoreAllMocks();
    envStore.getState().reset();
    shellStore.getState().reset();

    for (const unregister of UNREGISTER.splice(0)) {
        unregister();
    }
});

describe('the detail of a chosen entry', () => {
    it('shows a text entry in the format it arrived in', async () => {
        push('{"id":7,"ok":true}', 1700000000000);
        fireEvent.click(rows()[0] ?? document.body);

        const shown = detail();

        expect(shown).toHaveAttribute('data-format', 'json');

        // The payload is drawn by the editor: its document, not the DOM around it, says what
        // arrived, and the indentation is the one the viewer lays out.
        expect((await editorAt(0, shown)).text()).toContain('"id": 7');
    });

    it('shows a binary entry in hex', async () => {
        push(BINARY, 1700000000000);
        fireEvent.click(rows()[0] ?? document.body);

        const shown = detail();

        expect(shown).toHaveAttribute('data-format', 'binary');

        const dump = (await editorAt(0, shown)).text();

        expect(dump.startsWith('00000000: 00 01 68 6F 6C 61')).toBe(true);
        expect(dump.endsWith('..hola')).toBe(true);
    });

    /** The dock exists only while a line is marked: gone when the mark goes, list stays put. */
    it('unmounts the dock on deselecting, with the timeline staying where it is', () => {
        push('hola', 1700000000000);
        push('adiós', 1700000001000);

        expect(detail()).toBeUndefined();

        fireEvent.click(rows()[0] ?? document.body);

        expect(detail()).not.toBeUndefined();

        // Opening the dock remounts the timeline: the closing click asks the log for its rows
        // again instead of trusting the node the opening click held.
        fireEvent.click(rows()[0] ?? document.body);

        expect(detail()).toBeUndefined();
        expect(rows()).toHaveLength(2);
    });

    /** Clicking the marked line also closes, but that is not discoverable: the band carries
        the way out for whoever never guesses it. */
    it('closes the dock from its own band', () => {
        push('hola', 1700000000000);
        fireEvent.click(rows()[0] ?? document.body);

        expect(detail()).not.toBeUndefined();

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

        expect(detail()).toBeUndefined();
        expect(rows()).toHaveLength(1);
    });
});

describe('what a sent frame says about where it came from', () => {
    /** Forty sends a week are forty rows: the one that says which item it was is the useful one. */
    it('names the collection item the frame was written in, on the row itself', () => {
        pushOut('Pedido creado', 'local');

        expect(byPart('activity-name')).toHaveTextContent('Pedido creado');
    });

    it('says nothing about an item for a frame nobody wrote in the collection', () => {
        push('hola', 1700000000000);

        expect(allByPart('activity-name')).toHaveLength(0);
    });
});
