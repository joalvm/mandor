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

/** The entries without what the console stamps on them: the key, the time and the weight. */
function written() {
    return consoleStore
        .getState()
        .entries.map(({ level, text, detail, source }) => ({ level, text, detail, source }));
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

// The lines are those of connection-console-writes, read here as the console gets them from the hook.
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

        expect(written()).toEqual([
            { level: 'log', text: `Connecting · ${URL_OF}`, detail: undefined, source: 'Gateway' },
            { level: 'info', text: `Connected · ${URL_OF}`, detail: undefined, source: 'Gateway' },
            {
                level: 'log',
                text: `Disconnected · ${URL_OF}`,
                detail: undefined,
                source: 'Gateway',
            },
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

        const failure = written()[1];

        expect(failure).toMatchObject({ level: 'error', detail: 'getaddrinfo ENOTFOUND badurl' });
        expect(failure?.text).toMatch(/^ws:\/\/127\.0\.0\.1:8080\/alpha · \S/u);
    });

    it('writes each retry as a warning, and each new dial from rest', () => {
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

        expect(written().map(({ level }) => level)).toEqual(['log', 'warn', 'log']);
        expect(written()[1]?.text).toContain('attempt 2');
    });

    it('writes nothing once the window stops hearing', () => {
        const unmount = hear();

        unmount();
        move(() => {
            connectionsStore.getState().setConnectionState('alpha', 'connecting');
        });

        expect(written()).toEqual([]);
    });
});
