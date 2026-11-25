import { itemResource } from '@mandor/collections';
import type { RequestScriptOutput } from '@mandor/ipc';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useScriptsBroke } from '../../../../../src/renderer/features/requests/hooks/useScriptsBroke.js';
import { scriptOutputStore } from '../../../../../src/renderer/features/requests/lib/script-output-store.js';
import { requestsStore } from '../../../../../src/renderer/features/requests/requests-store.js';

const RESOURCE = itemResource('Local', 'tienda', 'crear-pedido');

const PLACE = { environmentId: 'staging', title: 'Crear pedido', workspaceId: 'tienda' };

function push(level: string): RequestScriptOutput {
    return {
        destinationMoved: false,
        error: { errorName: 'SyntaxError', level, message: 'unexpected token' },
        logs: [],
        phase: 'before',
        sendId: 's1',
        skipped: [],
        switchedOff: 0,
        tests: [],
        variables: [],
        withheld: [],
    };
}

function sent(level: string): void {
    act(() => {
        requestsStore.setState({ sends: { [RESOURCE]: { sendId: 's1', state: 'sending' } } });
        scriptOutputStore.getState().expect('s1', PLACE);
        scriptOutputStore.getState().receive(push(level));
    });
}

afterEach(() => {
    cleanup();
    requestsStore.getState().reset();
    scriptOutputStore.getState().reset();
});

describe('whether the scripts of a request broke on its last send', () => {
    it('says nothing before a send', () => {
        const { result } = renderHook(() => useScriptsBroke(RESOURCE));

        expect(result.current).toBe(false);
    });

    it('says so once a script of the request itself stopped', () => {
        const { result } = renderHook(() => useScriptsBroke(RESOURCE));

        sent('request');

        expect(result.current).toBe(true);
    });

    /** A script of the folder or the collection is told where it is written, not here. */
    it('leaves to its own level a script of the folder that stopped', () => {
        const { result } = renderHook(() => useScriptsBroke(RESOURCE));

        sent('folder');

        expect(result.current).toBe(false);
    });
});
