import { envStore } from '@mandor/env';
import type { RequestScriptOutput } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import {
    followScriptOutput,
    SCRIPT_OUTPUT_BYTES,
    scriptOutputStore,
} from '../../../../src/renderer/features/requests/lib/script-output-store.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';

const FIRST = '00000000-0000-4000-8000-000000000001';
const SECOND = '00000000-0000-4000-8000-000000000002';
const PLACE = { workspaceId: 'pagos', environmentId: 'prod', title: 'GET altas' };

function pushOf(sendId: string, change: Partial<RequestScriptOutput> = {}): RequestScriptOutput {
    return {
        sendId,
        phase: 'before',
        logs: [],
        tests: [],
        skipped: [],
        imported: 0,
        switchedOff: 0,
        variables: [],
        withheld: [],
        destinationMoved: false,
        ...change,
    };
}

function outputOf(sendId: string) {
    return scriptOutputStore.getState().runs[sendId]?.output;
}

beforeEach(() => {
    scriptOutputStore.getState().reset();
    requestsStore.getState().reset();
    envStore.getState().reset();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('what the scripts of a send said, as the window keeps it', () => {
    it('joins what both moments of a send said under the id of the send', () => {
        const store = scriptOutputStore.getState();

        store.expect(FIRST, PLACE);
        store.receive(
            pushOf(FIRST, {
                logs: [{ level: 'log', text: 'antes' }],
                imported: 1,
                destinationMoved: true,
            }),
        );
        store.receive(
            pushOf(FIRST, {
                phase: 'response',
                logs: [{ level: 'warn', text: 'después' }],
                tests: [{ name: 'status', passed: true }],
                error: { message: 'boom', errorName: 'Error', line: 3 },
                heldAt: 'https://otro.example/',
            }),
        );

        expect(outputOf(FIRST)).toEqual({
            logs: [
                { level: 'log', text: 'antes' },
                { level: 'warn', text: 'después' },
            ],
            tests: [{ name: 'status', passed: true }],
            skipped: [],
            imported: 1,
            switchedOff: 0,
            errors: [{ message: 'boom', errorName: 'Error', line: 3 }],
            withheld: [],
            destinationMoved: true,
            heldAt: 'https://otro.example/',
        });
    });

    it('lets a send it was not told about say nothing', () => {
        scriptOutputStore
            .getState()
            .receive(pushOf(FIRST, { logs: [{ level: 'log', text: 'x' }] }));

        expect(scriptOutputStore.getState().runs).toEqual({});
    });

    it('keeps only the sends some resource still shows', () => {
        const store = scriptOutputStore.getState();

        store.expect(FIRST, PLACE);
        store.expect(SECOND, PLACE);
        store.keep(new Set([SECOND]));

        expect(Object.keys(scriptOutputStore.getState().runs)).toEqual([SECOND]);
    });

    /** Many tabs that each ran a chatty script must not pile up: the window stays flat. */
    it('lets the oldest output go once all of them weigh more than the ceiling', () => {
        const store = scriptOutputStore.getState();
        const half = 'x'.repeat(SCRIPT_OUTPUT_BYTES / 4 + 1);

        store.expect(FIRST, PLACE);
        store.expect(SECOND, PLACE);
        store.receive(pushOf(FIRST, { logs: [{ level: 'log', text: half }] }));
        store.receive(pushOf(SECOND, { logs: [{ level: 'log', text: half }] }));

        expect(outputOf(FIRST)).toBeUndefined();
        expect(outputOf(SECOND)?.logs).toHaveLength(1);
    });

    it('shows what scripts set in the place of the send, replaced by each push', () => {
        const store = scriptOutputStore.getState();

        store.expect(FIRST, { workspaceId: 'pagos', environmentId: '', title: 'GET altas' });
        store.receive(pushOf(FIRST, { variables: [{ name: 'a', preview: '1' }] }));
        store.receive(
            pushOf(FIRST, { phase: 'response', variables: [{ name: 'b', preview: '2' }] }),
        );

        expect(envStore.getState().scriptVariables).toEqual({
            pagos: { '': [{ name: 'b', preview: '2' }] },
        });
    });

    /** A send left behind by a newer one still tells what main holds now, though not its output. */
    it('still shows what a send left behind set, once a newer send took its place', () => {
        const store = scriptOutputStore.getState();

        store.expect(FIRST, PLACE);
        store.keep(new Set());
        store.receive(
            pushOf(FIRST, { phase: 'response', variables: [{ name: 'tarde', preview: 'sí' }] }),
        );

        expect(outputOf(FIRST)).toBeUndefined();
        expect(envStore.getState().scriptVariables['pagos']?.['prod']).toEqual([
            { name: 'tarde', preview: 'sí' },
        ]);
    });

    it('hears the pushes of main and lets go of a send once its resource sends again', () => {
        let tell: (push: RequestScriptOutput) => void = () => undefined;
        const stopPush = vi.fn();

        vi.spyOn(syncBridge.request, 'onScriptOutput').mockImplementation((handler) => {
            tell = handler;

            return stopPush;
        });

        const stop = followScriptOutput();

        requestsStore.getState().beginSend('mandor://r', FIRST);
        scriptOutputStore.getState().expect(FIRST, PLACE);
        tell(pushOf(FIRST, { tests: [{ name: 'ok', passed: false, message: 'no' }] }));

        expect(outputOf(FIRST)?.tests).toHaveLength(1);

        requestsStore.getState().beginSend('mandor://r', SECOND);

        expect(scriptOutputStore.getState().runs[FIRST]).toBeUndefined();

        stop();

        expect(stopPush).toHaveBeenCalled();
    });
});
