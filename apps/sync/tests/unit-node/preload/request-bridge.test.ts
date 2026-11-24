import { bridgeKitOf } from '@mandor/host/bridge-kit';
import { CHANNELS } from '@mandor/ipc';
import type { HttpResponse } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { createRequestBridge } from '../../../src/preload/request-bridge.js';
import { REFUSED, spyBridgeIpc } from '@mandor/host/testing/bridge';

const ID = '6f0c2f8e-7a3b-4c52-9a38-0d3f8b8c3e11';

describe('the request bridge', () => {
    it('cancels by the id of the send, on its own channel', async () => {
        const ipc = spyBridgeIpc({ [CHANNELS.requestCancel]: { ok: true, value: {} } });
        const bridge = createRequestBridge(bridgeKitOf(ipc));

        expect(await bridge.cancel({ sendId: ID })).toEqual({ ok: true, value: {} });
        expect(ipc.calls).toEqual([[CHANNELS.requestCancel, { sendId: ID }]]);
    });

    it('reads a window of a body by its reference', async () => {
        const ref = 'a'.repeat(64);
        const window = { encoding: 'utf8', text: 'abc', total: 3 };
        const ipc = spyBridgeIpc({ [CHANNELS.requestBodyRead]: { ok: true, value: window } });
        const bridge = createRequestBridge(bridgeKitOf(ipc));

        expect(await bridge.readBody({ ref, offset: 0, length: 3 })).toEqual({
            ok: true,
            value: window,
        });
        expect(ipc.calls[0]).toEqual([CHANNELS.requestBodyRead, { ref, offset: 0, length: 3 }]);
    });

    it('saves a body where the user picks', async () => {
        const ipc = spyBridgeIpc({
            [CHANNELS.requestBodySave]: { ok: true, value: { path: null } },
        });
        const bridge = createRequestBridge(bridgeKitOf(ipc));

        expect(
            await bridge.saveBody({ encoding: 'utf8', text: 'x', suggestedName: 'a.txt' }),
        ).toEqual({ ok: true, value: { path: null } });
    });

    it('asks main to hide the secrets of an answer', async () => {
        const answer: HttpResponse = {
            status: 200,
            statusText: 'OK',
            httpVersion: '1.1',
            headers: [],
            body: null,
            sizes: { transferredBytes: 0, bodyBytes: 0, decoded: true },
            timings: {
                dnsMs: 0,
                connectMs: 0,
                tlsMs: 0,
                firstByteMs: 0,
                totalMs: 0,
                viaProxy: false,
            },
            redirects: [],
            cookies: [],
        };
        const ipc = spyBridgeIpc({ [CHANNELS.requestHideSecrets]: { ok: true, value: answer } });
        const bridge = createRequestBridge(bridgeKitOf(ipc));

        expect(await bridge.hideSecrets(answer)).toEqual({ ok: true, value: answer });
        expect(ipc.calls).toEqual([[CHANNELS.requestHideSecrets, answer]]);
    });

    /** What main answers is validated here: an answer out of contract is a bug in main. */
    it('throws on an answer that does not match its contract', async () => {
        const ipc = spyBridgeIpc({
            [CHANNELS.requestSend]: { ok: true, value: { status: 'nope' } },
        });
        const bridge = createRequestBridge(bridgeKitOf(ipc));

        await expect(bridge.send({} as never)).rejects.toThrow();
    });

    it('answers a refusal of main as it is', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createRequestBridge(bridgeKitOf(ipc));

        expect(await bridge.send({} as never)).toEqual(REFUSED);
    });

    it('delivers what the scripts of a send said and stops at the unsubscribe', () => {
        const ipc = spyBridgeIpc();
        const seen: unknown[] = [];
        const stop = createRequestBridge(bridgeKitOf(ipc)).onScriptOutput((push) =>
            seen.push(push),
        );
        const push = {
            sendId: ID,
            phase: 'response',
            logs: [],
            tests: [{ name: 'ok', passed: true }],
            skipped: [],
            switchedOff: 0,
            variables: [],
            withheld: [],
            destinationMoved: false,
        };

        ipc.emit(CHANNELS.requestScriptOutput, push);
        stop();
        ipc.emit(CHANNELS.requestScriptOutput, push);

        expect(seen).toEqual([push]);
        expect(ipc.listeners.get(CHANNELS.requestScriptOutput)).toEqual([]);
    });

    it('delivers what a send left and got and refuses a push out of its schema', () => {
        const ipc = spyBridgeIpc();
        const seen: unknown[] = [];

        createRequestBridge(bridgeKitOf(ipc)).onSendLog((push) => seen.push(push));

        const push = { sendId: ID, error: { code: 'request-failed', message: 'no' } };

        ipc.emit(CHANNELS.requestSendLog, push);

        expect(seen).toEqual([push]);
        expect(() => {
            ipc.emit(CHANNELS.requestSendLog, { sendId: ID, extra: 1 });
        }).toThrow();
    });

    it('refuses a push of the scripts that does not match its schema', () => {
        const ipc = spyBridgeIpc();

        createRequestBridge(bridgeKitOf(ipc)).onScriptOutput(() => undefined);

        expect(() => {
            ipc.emit(CHANNELS.requestScriptOutput, { sendId: ID });
        }).toThrow();
    });
});
