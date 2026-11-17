import { describe, expect, it } from 'vitest';

import type { ScriptsArea } from '../../src/bridge/scripts-area.js';
import { success } from '../../src/result/success.js';

describe('ScriptsArea', () => {
    /** The double implements the contract: a method added to the area stops this from compiling. */
    it('answers approve, status, the switch and both forgets, each with a Result', async () => {
        const area: ScriptsArea = {
            approve: () => Promise.resolve(success({ approved: true })),
            status: ({ scripts }) =>
                Promise.resolve(success({ statuses: scripts.map(() => 'unapproved' as const) })),
            forget: () => Promise.resolve(success({})),
            readSwitch: () => Promise.resolve(success({ enabled: true })),
            writeSwitch: () => Promise.resolve(success({})),
            clearVariables: () => Promise.resolve(success({})),
        };
        const script = {
            workspaceId: 'personal',
            level: 'request',
            event: 'onBeforeRequest',
            source: 'console.log("hola");',
        } as const;

        await expect(area.approve(script)).resolves.toEqual({
            ok: true,
            value: { approved: true },
        });
        await expect(area.status({ scripts: [script, script] })).resolves.toEqual({
            ok: true,
            value: { statuses: ['unapproved', 'unapproved'] },
        });
        await expect(area.writeSwitch(false)).resolves.toEqual({ ok: true, value: {} });
    });
});
