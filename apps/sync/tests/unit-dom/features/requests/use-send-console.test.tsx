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

function entries() {
    return consoleStore.getState().entries;
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

// The entry is that of send-console-entry, read here as the console gets it from the hook.
describe('what every send writes to the console of the window', () => {
    it('writes what left and what came back as one entry, with the headers and bodies under it', () => {
        const { tell } = heard();

        tell({
            sendId: SEND,
            sent: { ...SENT, body: '{"user":"ana"}' },
            answer: {
                status: 201,
                statusText: 'Created',
                totalMs: 120,
                bodyBytes: 1200,
                headers: [
                    ['content-type', 'application/json'],
                    ['set-cookie', 'a=1'],
                    ['set-cookie', 'b=2'],
                ],
                body: 'plain text',
            },
        });

        expect(entries()).toHaveLength(1);
        expect(entries()[0]).toMatchObject({
            level: 'log',
            text: 'POST http://localhost:81/session',
            source: 'POST Sesión',
            network: true,
            status: { text: '201 Created', outcome: 'ok' },
            time: '120 ms',
            sections: [
                { title: 'Request headers', value: { 'User-Agent': 'Mozilla/5.0' } },
                { title: 'Request body', value: { user: 'ana' } },
                {
                    title: 'Response headers',
                    value: { 'content-type': 'application/json', 'set-cookie': ['a=1', 'b=2'] },
                },
                { title: 'Response body', value: 'plain text' },
            ],
        });
    });

    it('writes a refusal of the server in red, as Postman does', () => {
        const { tell } = heard();

        tell({
            sendId: SEND,
            sent: { ...SENT, headers: [] },
            answer: { status: 404, statusText: '', totalMs: 3, bodyBytes: 0, headers: [] },
        });

        expect(entries()[0]).toMatchObject({
            level: 'error',
            status: { text: '404', outcome: 'refused' },
            sections: [],
        });
    });

    it('writes why nothing came back, in the words of the error and of the transport', () => {
        const { tell } = heard();

        tell({
            sendId: SEND,
            sent: { ...SENT, headers: [] },
            error: { code: 'request-unreachable', message: 'getaddrinfo ENOTFOUND badurl' },
        });

        expect(entries()[0]).toMatchObject({
            level: 'error',
            text: 'POST http://localhost:81/session',
        });
        expect(entries()[0]?.detail).toMatch(/\S\ngetaddrinfo ENOTFOUND badurl$/u);
        expect(entries()[0]?.status).toBeUndefined();
    });

    it('writes a send that ended before leaving under its name, and a cancel without the red', () => {
        const { tell } = heard();

        tell({ sendId: SEND, error: { code: 'request-aborted', message: '' } });

        expect(entries()).toHaveLength(1);
        expect(entries()[0]).toMatchObject({ level: 'log', text: 'POST Sesión' });
        expect(entries()[0]?.detail).not.toContain('\n');
    });

    it('writes nothing for a send it was not told of, and stops hearing once unmounted', () => {
        const { stopPush, tell, unmount } = heard();

        tell({ sendId: UNKNOWN, error: { code: 'request-failed', message: 'no' } });
        unmount();

        expect(entries()).toEqual([]);
        expect(stopPush).toHaveBeenCalledOnce();
    });
});
