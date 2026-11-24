import { consoleStore } from '@mandor/shell';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { connectionsStore } from '../../../../../src/renderer/features/connections/connections-store.js';
import { useConnectionConsole } from '../../../../../src/renderer/features/connections/hooks/useConnectionConsole.js';
import { AppProviders } from '../../../support/app-providers.js';
import { fakeConnection } from '../support/fake-connections.js';

const URL_OF = 'ws://127.0.0.1:8080/alpha';

function hear(): () => void {
    const { unmount } = renderHook(
        () => {
            useConnectionConsole();
        },
        { wrapper: AppProviders },
    );

    return unmount;
}

function move(change: () => void): void {
    act(() => {
        change();
    });
}

function runs() {
    return consoleStore.getState().runs;
}

beforeEach(() => {
    connectionsStore.getState().reset();
    consoleStore.getState().clear();
    connectionsStore.getState().upsertConnection(fakeConnection('alpha', 'Gateway'));
});

afterEach(() => {
    cleanup();
    connectionsStore.getState().reset();
});

// The lines are those of connection-console, read here as the console gets them from the hook.
describe('what every connection writes to the console of the window', () => {
    it('writes the dial, the socket coming up and going down, under the name of the connection', () => {
        hear();

        move(() => {
            connectionsStore.getState().setConnectionState('alpha', 'connecting');
        });
        move(() => {
            connectionsStore.getState().setConnectionState('alpha', 'open');
        });
        move(() => {
            connectionsStore.getState().setConnectionState('alpha', 'closed');
        });

        expect(runs()).toHaveLength(1);
        expect(runs()[0]?.title).toBe('Gateway');
        expect(runs()[0]?.lines.map(({ tone, text }) => ({ tone, text }))).toEqual([
            { tone: 'note', text: `Connecting · ${URL_OF}` },
            { tone: 'info', text: `Connected · ${URL_OF}` },
            { tone: 'note', text: `Disconnected · ${URL_OF}` },
        ]);
    });

    it('writes a failure in red, with what the transport said under it', () => {
        hear();

        move(() => {
            connectionsStore.getState().setConnectionState('alpha', 'connecting');
        });
        move(() => {
            connectionsStore
                .getState()
                .setConnectionError('alpha', 'ws-open-failed', 'getaddrinfo ENOTFOUND badurl');
        });

        const failure = runs()[0]?.lines[1];

        expect(failure).toMatchObject({ tone: 'error', detail: 'getaddrinfo ENOTFOUND badurl' });
        expect(failure?.text).toMatch(/^ws:\/\/127\.0\.0\.1:8080\/alpha · \S/u);
    });

    it('writes each retry, and a new dial from rest as a run of its own', () => {
        hear();

        move(() => {
            connectionsStore.getState().setConnectionState('alpha', 'connecting');
        });
        move(() => {
            connectionsStore.getState().setConnectionState('alpha', 'reconnecting', 2);
        });
        move(() => {
            connectionsStore.getState().setConnectionState('alpha', 'error');
        });
        move(() => {
            connectionsStore.getState().setConnectionState('alpha', 'connecting');
        });

        expect(runs()).toHaveLength(2);
        const tones = runs().map((run) => run.lines.map(({ tone }) => tone).join(' '));

        expect(tones.sort()).toEqual(['note', 'note warn']);
        expect(
            runs().some((run) => run.lines.some((line) => line.text.includes('attempt 2'))),
        ).toBe(true);
    });

    it('writes nothing once the window stops hearing', () => {
        const unmount = hear();

        unmount();
        move(() => {
            connectionsStore.getState().setConnectionState('alpha', 'connecting');
        });

        expect(runs()).toEqual([]);
    });
});
