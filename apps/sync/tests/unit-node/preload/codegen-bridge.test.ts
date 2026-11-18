import { bridgeKitOf } from '@mandor/host/bridge-kit';
import { CHANNELS } from '@mandor/ipc';
import { createRequestItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { createCodegenBridge } from '../../../src/preload/codegen-bridge.js';
import { REFUSED, spyBridgeIpc } from '@mandor/host/testing/bridge';

const SNIPPET_INPUT = {
    workspaceId: 'demo',
    itemPath: 'ping',
    environmentId: null,
    request: createRequestItem({ name: 'Ping' }),
    target: 'curl',
} as const;

describe('the codegen bridge', () => {
    it('reads a curl command on its own channel', async () => {
        const answer = { ok: true, value: { kind: 'invalid', reason: 'noUrl' } };
        const ipc = spyBridgeIpc({ [CHANNELS.codegenFromCurl]: answer });
        const bridge = createCodegenBridge(bridgeKitOf(ipc));

        expect(await bridge.fromCurl({ text: 'curl' })).toEqual(answer);
        expect(ipc.calls).toEqual([[CHANNELS.codegenFromCurl, { text: 'curl' }]]);
    });

    it('asks for a snippet on its own channel', async () => {
        const answer = { ok: true, value: { code: 'curl x', leftOutFile: null } };
        const ipc = spyBridgeIpc({ [CHANNELS.codegenSnippet]: answer });
        const bridge = createCodegenBridge(bridgeKitOf(ipc));

        expect(await bridge.snippet(SNIPPET_INPUT)).toEqual(answer);
        expect(ipc.calls[0]?.[0]).toBe(CHANNELS.codegenSnippet);
    });

    /** What main answers is validated here: an answer out of contract is a bug in main. */
    it('throws on an answer that does not match its contract', async () => {
        const ipc = spyBridgeIpc({ [CHANNELS.codegenSnippet]: { ok: true, value: { code: 1 } } });
        const bridge = createCodegenBridge(bridgeKitOf(ipc));

        await expect(bridge.snippet(SNIPPET_INPUT)).rejects.toThrow();
    });

    it('answers a refusal of main as it is', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createCodegenBridge(bridgeKitOf(ipc));

        expect(await bridge.snippet(SNIPPET_INPUT)).toEqual(REFUSED);
    });
});
