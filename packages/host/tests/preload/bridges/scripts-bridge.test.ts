import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createBridgeCall } from '../../../src/preload/bridge-call.js';
import { createScriptsBridge } from '../../../src/preload/bridges/scripts-bridge.js';
import { spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

const SCRIPT = {
    workspaceId: 'ws',
    level: 'request',
    event: 'onResponse',
    source: 'x',
} as const;

describe('the scripts bridge of the preload', () => {
    it('sends each call to its channel with its payload', async () => {
        const ipc = spyBridgeIpc({
            [CHANNELS.scriptsApprove]: { ok: true, value: { approved: true } },
            [CHANNELS.scriptsStatus]: { ok: true, value: { statuses: ['approved'] } },
            [CHANNELS.scriptsSwitchRead]: { ok: true, value: { enabled: false } },
        });
        const bridge = createScriptsBridge(createBridgeCall(ipc));

        await expect(bridge.approve(SCRIPT)).resolves.toEqual({
            ok: true,
            value: { approved: true },
        });
        await expect(bridge.status({ scripts: [SCRIPT] })).resolves.toEqual({
            ok: true,
            value: { statuses: ['approved'] },
        });
        await bridge.forget();
        await expect(bridge.readSwitch()).resolves.toEqual({ ok: true, value: { enabled: false } });
        await bridge.writeSwitch(true);
        await bridge.clearVariables('ws');

        expect(ipc.calls).toEqual([
            [CHANNELS.scriptsApprove, SCRIPT],
            [CHANNELS.scriptsStatus, { scripts: [SCRIPT] }],
            [CHANNELS.scriptsForget, undefined],
            [CHANNELS.scriptsSwitchRead, undefined],
            [CHANNELS.scriptsSwitchWrite, { enabled: true }],
            [CHANNELS.scriptsClearVariables, { workspaceId: 'ws' }],
        ]);
    });

    it('refuses an answer that breaks the contract', async () => {
        const ipc = spyBridgeIpc({
            [CHANNELS.scriptsStatus]: { ok: true, value: { statuses: ['maybe'] } },
        });

        await expect(
            createScriptsBridge(createBridgeCall(ipc)).status({ scripts: [SCRIPT] }),
        ).rejects.toThrow();
    });
});
