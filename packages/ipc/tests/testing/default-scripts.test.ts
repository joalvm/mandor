import { describe, expect, it } from 'vitest';

import { defaultScripts } from '../../src/testing/default-scripts.js';

describe('defaultScripts', () => {
    it('approves nothing, leaves every script unapproved and keeps the switch on', async () => {
        const area = defaultScripts();
        const script = {
            workspaceId: 'ws',
            level: 'request',
            event: 'onResponse',
            source: 'x',
        } as const;

        await expect(area.approve(script)).resolves.toEqual({
            ok: true,
            value: { approved: false },
        });
        await expect(area.status({ scripts: [script, script] })).resolves.toEqual({
            ok: true,
            value: { statuses: ['unapproved', 'unapproved'] },
        });
        await expect(area.forget()).resolves.toEqual({ ok: true, value: {} });
        await expect(area.readSwitch()).resolves.toEqual({ ok: true, value: { enabled: true } });
        await expect(area.writeSwitch(false)).resolves.toEqual({ ok: true, value: {} });
        await expect(area.clearVariables('ws')).resolves.toEqual({ ok: true, value: {} });
    });
});
