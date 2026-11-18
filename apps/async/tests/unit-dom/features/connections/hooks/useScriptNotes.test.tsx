import { envStore } from '@mandor/env';
import { ROOT_GROUP_ID, type WsScriptNote } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { consoleStore, shellStore } from '@mandor/shell';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { activityStore } from '../../../../../src/renderer/activity/activity-store.js';
import { asyncBridge } from '../../../../../src/renderer/app/async-bridge.js';
import { connectionsStore } from '../../../../../src/renderer/features/connections/connections-store.js';
import { useScriptNotes } from '../../../../../src/renderer/features/connections/hooks/useScriptNotes.js';
import { AppProviders } from '../../../support/app-providers.js';
import { scriptNoteOf } from '../../../support/activity-entries.js';

const fakeBridge = asyncBridge as FakeBridge;
const RESOURCE = 'mandor://demo/events/connection/alpha';
const SET = [{ name: 'ticket', preview: 'abc' }];

function connect(environmentId: string | null): void {
    connectionsStore.getState().upsertConnection({
        id: 'alpha',
        name: 'Gateway',
        transport: 'websocket',
        url: 'wss://example.test/socket',
        headers: [],
        environmentId,
    });
}

function hear(): { say: (note: WsScriptNote) => void; unmount: () => void } {
    const { unmount } = renderHook(
        () => {
            useScriptNotes();
        },
        { wrapper: AppProviders },
    );

    return {
        say: (note) => {
            act(() => {
                fakeBridge.emitScriptNote(note);
            });
        },
        unmount,
    };
}

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.setState({ activeOriginId: 'demo', activeWorkspaceId: 'events' });
    shellStore
        .getState()
        .openTab(ROOT_GROUP_ID, { id: 'alpha', kind: 'connection', resource: RESOURCE });
    activityStore.getState().reset();
    envStore.getState().reset();
    consoleStore.getState().clear();
    connect('prod');
});

afterEach(() => {
    cleanup();
    connectionsStore.getState().reset();
    shellStore.getState().reset();
});

describe('what the window hears of the scripts of a connection', () => {
    it('marks the timeline of the open connection with the note', () => {
        hear().say(scriptNoteOf({ logs: [{ level: 'log', text: 'hi' }] }));

        expect(activityStore.getState().entries[RESOURCE]?.[0]).toMatchObject({
            kind: 'connection-script',
            detail: { event: 'onBeforeConnect' },
        });
    });

    it('writes nothing on the timeline for a note that says nothing', () => {
        hear().say(scriptNoteOf());

        expect(activityStore.getState().entries[RESOURCE]).toBeUndefined();
        expect(consoleStore.getState().runs).toEqual([]);
    });

    it('writes what the scripts said to the console, under the connection and the moment', () => {
        hear().say(
            scriptNoteOf({
                event: 'onConnect',
                logs: [
                    { level: 'log', text: 'hi' },
                    { level: 'warn', notice: 'no-reconnect' },
                ],
            }),
        );

        const [run] = consoleStore.getState().runs;

        expect(run).toMatchObject({ id: 'alpha/onConnect', title: 'Gateway · On connect' });
        expect(run?.lines.map((line) => line.text)).toEqual([
            'hi',
            'A script ran before this connection opened: it does not reconnect on its own.',
        ]);
    });

    it('keeps the notes of one moment under one heading', () => {
        const notes = hear();

        notes.say(scriptNoteOf({ event: 'onMessage', at: 1, logs: [{ level: 'log', text: 'a' }] }));
        notes.say(scriptNoteOf({ event: 'onMessage', at: 2, logs: [{ level: 'log', text: 'b' }] }));

        const runs = consoleStore.getState().runs;

        expect(runs).toHaveLength(1);
        expect(runs[0]?.lines.map((line) => line.text)).toEqual(['a', 'b']);
    });

    it('shows what the scripts set in the environment the connection resolves against', () => {
        hear().say(scriptNoteOf({ variables: SET }));

        expect(envStore.getState().scriptVariables).toEqual({ events: { prod: SET } });
    });

    it('shows nothing set for a connection that resolves against no environment', () => {
        connect(null);
        hear().say(scriptNoteOf({ variables: SET }));

        expect(envStore.getState().scriptVariables).toEqual({});
    });

    it('marks the timeline yet writes no console for a connection the window does not know', () => {
        connectionsStore.getState().reset();
        hear().say(scriptNoteOf({ logs: [{ level: 'log', text: 'hi' }] }));

        expect(activityStore.getState().entries[RESOURCE]).toHaveLength(1);
        expect(consoleStore.getState().runs).toEqual([]);
    });

    it('stops hearing when the window lets go of it', () => {
        const notes = hear();

        notes.unmount();
        act(() => {
            fakeBridge.emitScriptNote(scriptNoteOf({ logs: [{ level: 'log', text: 'hi' }] }));
        });

        expect(consoleStore.getState().runs).toEqual([]);
    });
});
