import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { act, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { failure, success } from '@mandor/ipc';

import { connectionsStore } from '../../../../src/renderer/features/connections/connections-store.js';
import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import { useConnectionRecording } from '../../../../src/renderer/features/connections/hooks/useConnectionRecording.js';
import { AppProviders } from '../../support/app-providers.js';

const NOTIFY = vi.fn();

/** The seed of the recorder arrives on a promise; the flush lets it land inside act. */
async function drawHook(connectionId = 'echo') {
    const view = renderHook(
        () =>
            useConnectionRecording({
                connectionId,
                connectionName: 'Echo',
            }),
        {
            wrapper: ({ children }: { children: ReactNode }) => (
                <AppProviders onNotify={NOTIFY}>{children}</AppProviders>
            ),
        },
    );

    await act(() => Promise.resolve());

    return view;
}

describe('the recording of the connection the user looks at', () => {
    afterEach(() => {
        // The window goes first: resetting a store under a mounted tree is an update outside act.
        cleanup();

        connectionsStore.getState().reset();
        NOTIFY.mockClear();
    });

    it('answers the resting state while nothing records', async () => {
        const { result } = await drawHook();

        expect(result.current.recording).toEqual({ active: false, entries: 0 });
    });

    it('asks main what its connection is doing, in case the recording outlived the tab', async () => {
        const status = vi
            .spyOn(asyncBridge.record, 'status')
            .mockImplementation(() => Promise.resolve(success({ active: true, entries: 12 })));

        const { result } = await drawHook();

        await waitFor(() => {
            expect(result.current.recording).toEqual({ active: true, entries: 12 });
        });
        expect(status.mock.calls[0]?.[0]).toEqual({ connectionId: 'echo' });

        status.mockRestore();
    });

    it('picks the file first and starts only with the path the user chose', async () => {
        const pick = vi
            .spyOn(asyncBridge.record, 'pick')
            .mockImplementation(() => Promise.resolve(success({ path: '/tmp/echo.jsonl' })));
        const start = vi
            .spyOn(asyncBridge.record, 'start')
            .mockImplementation(() => Promise.resolve(success({})));

        const { result } = await drawHook();

        act(() => {
            result.current.onRecordToggle();
        });

        await waitFor(() => {
            expect(start).toHaveBeenCalledWith({ connectionId: 'echo', path: '/tmp/echo.jsonl' });
        });
        expect(pick.mock.calls[0]?.[0]?.suggestedName).toBe('Echo.jsonl');
        expect(NOTIFY).not.toHaveBeenCalled();

        pick.mockRestore();
        start.mockRestore();
    });

    it('starts nothing when the user closes the dialog without choosing', async () => {
        const pick = vi
            .spyOn(asyncBridge.record, 'pick')
            .mockImplementation(() => Promise.resolve(success({ path: null })));
        const start = vi
            .spyOn(asyncBridge.record, 'start')
            .mockImplementation(() => Promise.resolve(success({})));

        const { result } = await drawHook();

        act(() => {
            result.current.onRecordToggle();
        });

        await act(async () => {
            await Promise.resolve();
        });

        expect(start).not.toHaveBeenCalled();
        expect(NOTIFY).not.toHaveBeenCalled();

        pick.mockRestore();
        start.mockRestore();
    });

    it('stops the recording and offers the file it wrote, where it lives', async () => {
        connectionsStore.getState().setRecording('echo', { active: true, entries: 41 });
        const stop = vi
            .spyOn(asyncBridge.record, 'stop')
            .mockImplementation(() =>
                Promise.resolve(success({ entries: 41, path: '/tmp/echo.jsonl' })),
            );
        const reveal = vi
            .spyOn(asyncBridge.record, 'reveal')
            .mockImplementation(() => Promise.resolve(success({})));

        const { result } = await drawHook();

        act(() => {
            result.current.onRecordToggle();
        });

        await waitFor(() => {
            expect(NOTIFY).toHaveBeenCalledOnce();
        });
        expect(stop).toHaveBeenCalledWith({ connectionId: 'echo' });

        const request = NOTIFY.mock.calls[0]?.[0] as
            { action?: { label: string; onSelect: () => void } } | undefined;

        expect(request?.action).toBeDefined();

        await act(() => Promise.resolve(request?.action?.onSelect()));

        expect(reveal).toHaveBeenCalledWith({ path: '/tmp/echo.jsonl' });

        stop.mockRestore();
        reveal.mockRestore();
    });

    it('raises the code of a refused start', async () => {
        const pick = vi
            .spyOn(asyncBridge.record, 'pick')
            .mockImplementation(() => Promise.resolve(success({ path: '/tmp/echo.jsonl' })));
        const start = vi
            .spyOn(asyncBridge.record, 'start')
            .mockImplementation(() => Promise.resolve(failure('record-active', 'already running')));

        const { result } = await drawHook();

        act(() => {
            result.current.onRecordToggle();
        });

        await waitFor(() => {
            expect(NOTIFY).toHaveBeenCalledWith({
                title: 'This connection is already recording. Stop that recording before starting another.',
                tone: 'error',
            });
        });

        pick.mockRestore();
        start.mockRestore();
    });
});
