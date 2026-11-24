import type { RequestScriptOutput } from '@mandor/ipc';
import { consoleStore } from '@mandor/shell';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { useScriptConsole } from '../../../../src/renderer/features/requests/hooks/useScriptConsole.js';
import { scriptOutputStore } from '../../../../src/renderer/features/requests/lib/script-output-store.js';
import { AppProviders } from '../../support/app-providers.js';

const SEND = '00000000-0000-4000-8000-000000000001';
const UNKNOWN = '00000000-0000-4000-8000-000000000009';

function pushOf(sendId: string, change: Partial<RequestScriptOutput> = {}): RequestScriptOutput {
    return {
        sendId,
        phase: 'before',
        logs: [],
        tests: [],
        skipped: [],
        switchedOff: 0,
        variables: [],
        withheld: [],
        destinationMoved: false,
        ...change,
    };
}

/** Mounts the hook over a bridge whose pushes the test makes, and returns how to make one. */
function heard() {
    let tell: (push: RequestScriptOutput) => void = () => undefined;
    const stopPush = vi.fn();

    vi.spyOn(syncBridge.request, 'onScriptOutput').mockImplementation((handler) => {
        tell = handler;

        return stopPush;
    });

    const { unmount } = renderHook(
        () => {
            useScriptConsole();
        },
        { wrapper: AppProviders },
    );

    return {
        stopPush,
        tell: (push: RequestScriptOutput) => {
            act(() => {
                tell(push);
            });
        },
        unmount,
    };
}

beforeEach(() => {
    scriptOutputStore.getState().reset();
    consoleStore.getState().clear();
    scriptOutputStore
        .getState()
        .expect(SEND, { workspaceId: 'pagos', environmentId: 'prod', title: 'GET altas' });
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('what the scripts of every send write to the console of the window', () => {
    it('writes both moments of a send under one heading named after the request', () => {
        const { tell } = heard();

        tell(pushOf(SEND, { logs: [{ level: 'log', text: 'antes' }] }));
        tell(pushOf(SEND, { phase: 'response', logs: [{ level: 'warn', text: 'después' }] }));

        const runs = consoleStore.getState().runs;

        expect(runs).toHaveLength(1);
        expect(runs[0]?.title).toBe('GET altas');
        expect(runs[0]?.lines.map((line) => line.text)).toEqual(['antes', 'después']);
    });

    it('writes nothing for a send whose scripts said nothing, nor for one it was not told of', () => {
        const { tell } = heard();

        tell(pushOf(SEND));
        tell(pushOf(UNKNOWN, { logs: [{ level: 'log', text: 'suelto' }] }));

        expect(consoleStore.getState().runs).toEqual([]);
    });

    it('leaves the console put away, even when a script broke', () => {
        const { tell } = heard();

        tell(pushOf(SEND, { error: { errorName: 'Error', message: 'no' } }));

        expect(consoleStore.getState().runs[0]?.lines[0]?.tone).toBe('error');
        expect(consoleStore.getState().open).toBe(false);
    });

    it('stops hearing main once it is unmounted', () => {
        const { stopPush, unmount } = heard();

        unmount();

        expect(stopPush).toHaveBeenCalledOnce();
    });
});
