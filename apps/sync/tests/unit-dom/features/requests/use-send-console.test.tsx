import type { RequestSendLog } from '@mandor/ipc';
import { consoleStore } from '@mandor/shell';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { useSendConsole } from '../../../../src/renderer/features/requests/hooks/useSendConsole.js';
import { scriptOutputStore } from '../../../../src/renderer/features/requests/lib/script-output-store.js';
import { AppProviders } from '../../support/app-providers.js';

const SEND = '00000000-0000-4000-8000-000000000001';
const UNKNOWN = '00000000-0000-4000-8000-000000000009';

const SENT = {
    method: 'POST',
    url: 'http://localhost:81/session',
    headers: [['User-Agent', 'Mozilla/5.0'] as [string, string]],
};

/** Mounts the hook over a bridge whose pushes the test makes, and returns how to make one. */
function heard() {
    let tell: (log: RequestSendLog) => void = () => undefined;
    const stopPush = vi.fn();

    vi.spyOn(syncBridge.request, 'onSendLog').mockImplementation((handler) => {
        tell = handler;

        return stopPush;
    });

    const { unmount } = renderHook(
        () => {
            useSendConsole();
        },
        { wrapper: AppProviders },
    );

    return {
        stopPush,
        tell: (log: RequestSendLog) => {
            act(() => {
                tell(log);
            });
        },
        unmount,
    };
}

function lines() {
    return consoleStore.getState().runs[0]?.lines ?? [];
}

beforeEach(() => {
    scriptOutputStore.getState().reset();
    consoleStore.getState().clear();
    scriptOutputStore
        .getState()
        .expect(SEND, { workspaceId: 'pagos', environmentId: 'prod', title: 'POST Sesión' });
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

// The lines are those of send-log-lines, read here as the console gets them from the hook.
describe('what every send writes to the console of the window', () => {
    it('writes what left and what came back, with the headers of both under it', () => {
        const { tell } = heard();

        tell({
            sendId: SEND,
            sent: SENT,
            answer: {
                status: 201,
                statusText: 'Created',
                totalMs: 120,
                bodyBytes: 1200,
                headers: [
                    ['content-type', 'application/json'],
                    ['x-id', '7'],
                ],
            },
        });

        expect(consoleStore.getState().runs[0]?.title).toBe('POST Sesión');
        expect(lines()).toEqual([
            {
                key: 'send',
                tone: 'log',
                text: 'POST http://localhost:81/session · 201 Created · 120 ms · 1.2 kB',
            },
            {
                key: 'send-sent',
                tone: 'note',
                text: 'Request headers',
                detail: 'User-Agent: Mozilla/5.0',
            },
            {
                key: 'send-answer',
                tone: 'note',
                text: 'Response headers',
                detail: 'content-type: application/json\nx-id: 7',
            },
        ]);
    });

    it('writes a refusal of the server in red, as a browser does', () => {
        const { tell } = heard();

        tell({
            sendId: SEND,
            sent: { ...SENT, headers: [] },
            answer: { status: 404, statusText: '', totalMs: 3, bodyBytes: 0, headers: [] },
        });

        expect(lines()).toEqual([
            {
                key: 'send',
                tone: 'error',
                text: 'POST http://localhost:81/session · 404 · 3 ms · 0 B',
            },
        ]);
    });

    it('writes why nothing came back, in the words of the error and of the transport', () => {
        const { tell } = heard();

        tell({
            sendId: SEND,
            sent: { ...SENT, headers: [] },
            error: { code: 'request-unreachable', message: 'getaddrinfo ENOTFOUND badurl' },
        });

        expect(lines()[0]).toMatchObject({ tone: 'error', detail: 'getaddrinfo ENOTFOUND badurl' });
        expect(lines()[0]?.text).toMatch(/^POST http:\/\/localhost:81\/session · \S/u);
    });

    it('writes a send that ended before leaving and a cancel without the red', () => {
        const { tell } = heard();

        tell({ sendId: SEND, error: { code: 'request-aborted', message: '' } });

        expect(lines()).toHaveLength(1);
        expect(lines()[0]?.tone).toBe('note');
        expect(lines()[0]?.detail).toBeUndefined();
        expect(lines()[0]?.text).not.toContain('POST');
    });

    it('writes nothing for a send it was not told of, and stops hearing once unmounted', () => {
        const { stopPush, tell, unmount } = heard();

        tell({ sendId: UNKNOWN, error: { code: 'request-failed', message: 'no' } });
        unmount();

        expect(consoleStore.getState().runs).toEqual([]);
        expect(stopPush).toHaveBeenCalledOnce();
    });
});
