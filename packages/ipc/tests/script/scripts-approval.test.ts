import { describe, expect, it } from 'vitest';

import {
    SCRIPTS_STATUS_MAX,
    scriptsApproveRequestSchema,
    scriptsApproveResultSchema,
    scriptsClearVariablesRequestSchema,
    scriptsForgetRequestSchema,
    scriptsStatusRequestSchema,
    scriptsStatusResultSchema,
    scriptsSwitchReadResultSchema,
    scriptsSwitchWriteRequestSchema,
} from '../../src/index.js';

const REF = {
    workspaceId: 'ws-1',
    level: 'request',
    event: 'onBeforeRequest',
    source: 'console.log(1)',
} as const;

describe('scriptsApproveRequestSchema', () => {
    it('takes a script, with or without the text it comes from', () => {
        expect(scriptsApproveRequestSchema.safeParse(REF).success).toBe(true);
        expect(scriptsApproveRequestSchema.safeParse({ ...REF, previousSource: '' }).success).toBe(
            true,
        );
    });

    it('never takes an origin, and refuses a level, an event or a workspace that is none', () => {
        expect(scriptsApproveRequestSchema.safeParse({ ...REF, origin: 'x' }).success).toBe(false);
        expect(scriptsApproveRequestSchema.safeParse({ ...REF, level: 'repo' }).success).toBe(
            false,
        );
        expect(scriptsApproveRequestSchema.safeParse({ ...REF, event: 'onNope' }).success).toBe(
            false,
        );
        expect(scriptsApproveRequestSchema.safeParse({ ...REF, workspaceId: '../x' }).success).toBe(
            false,
        );
    });

    it('answers whether it approved', () => {
        expect(scriptsApproveResultSchema.parse({ ok: true, value: { approved: false } })).toEqual({
            ok: true,
            value: { approved: false },
        });
    });
});

describe('scriptsStatusRequestSchema', () => {
    it('takes up to the limit of scripts and no more', () => {
        const some = (count: number) => ({ scripts: Array.from({ length: count }, () => REF) });

        expect(scriptsStatusRequestSchema.safeParse(some(SCRIPTS_STATUS_MAX)).success).toBe(true);
        expect(scriptsStatusRequestSchema.safeParse(some(SCRIPTS_STATUS_MAX + 1)).success).toBe(
            false,
        );
        expect(SCRIPTS_STATUS_MAX).toBe(64);
    });

    it('answers one of three statuses for each script', () => {
        expect(
            scriptsStatusResultSchema.safeParse({
                ok: true,
                value: { statuses: ['approved', 'unapproved', 'tooLarge'] },
            }).success,
        ).toBe(true);
        expect(
            scriptsStatusResultSchema.safeParse({ ok: true, value: { statuses: ['maybe'] } })
                .success,
        ).toBe(false);
    });
});

describe('the rest of the scripts channels', () => {
    it('clears the values of one workspace, named', () => {
        expect(scriptsClearVariablesRequestSchema.safeParse({ workspaceId: 'ws' }).success).toBe(
            true,
        );
        expect(scriptsClearVariablesRequestSchema.safeParse({ workspaceId: '' }).success).toBe(
            false,
        );
        expect(
            scriptsClearVariablesRequestSchema.safeParse({ workspaceId: 'ws', origin: 'x' })
                .success,
        ).toBe(false);
    });

    it('forgets with nothing to say, and switches with a flag', () => {
        expect(scriptsForgetRequestSchema.safeParse({}).success).toBe(true);
        expect(scriptsForgetRequestSchema.safeParse({ all: true }).success).toBe(false);
        expect(scriptsSwitchWriteRequestSchema.safeParse({ enabled: false }).success).toBe(true);
        expect(scriptsSwitchWriteRequestSchema.safeParse({ enabled: 'no' }).success).toBe(false);
        expect(
            scriptsSwitchReadResultSchema.safeParse({ ok: true, value: { enabled: true } }).success,
        ).toBe(true);
    });
});
