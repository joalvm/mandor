import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CHANNELS, SCRIPTS_STATUS_MAX } from '@mandor/ipc';
import { SCRIPT_LIMITS } from '@mandor/script';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { approvedScripts } from '../../src/script/approved-scripts.js';
import { createScriptVariables, type ScriptVariables } from '../../src/script/script-variables.js';
import { openScripts, registerScriptsHandlers } from '../../src/script/scripts.handlers.js';
import { createScriptsSwitch } from '../../src/script/scripts-switch.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';

let userData: string;
let ipc: IpcSpy;
let dispose: () => void;
let variables: ScriptVariables;

const SCRIPT = {
    workspaceId: 'ws-1',
    level: 'request',
    event: 'onBeforeRequest',
    source: 'console.log(1)',
} as const;

function open(id: string): void {
    setActiveOrigin({ id, name: id, kind: 'local', root: userData });
}

beforeEach(async () => {
    userData = await mkdtemp(join(tmpdir(), 'mandor-scripts-'));
    ipc = spyIpc();
    variables = createScriptVariables();
    dispose = registerScriptsHandlers(ipc, {
        approvals: approvedScripts(userData),
        scriptsSwitch: await createScriptsSwitch(userData),
        variables,
    });
    open('local');
});

afterEach(async () => {
    dispose();
    setActiveOrigin(null);
    await rm(userData, { recursive: true, force: true });
});

async function statusOf(...scripts: object[]): Promise<unknown> {
    const answer = (await ipc.call(CHANNELS.scriptsStatus, { scripts })) as {
        value?: { statuses: string[] };
    };

    return answer.value?.statuses;
}

async function approvalsFile(): Promise<string> {
    return readFile(join(userData, 'approved-scripts.txt'), 'utf8').catch(() => '');
}

describe('approving a script', () => {
    it('approves what the button sent, and only for that origin, workspace, level and event', async () => {
        expect(await statusOf(SCRIPT)).toEqual(['unapproved']);
        await expect(ipc.call(CHANNELS.scriptsApprove, SCRIPT)).resolves.toEqual({
            ok: true,
            value: { approved: true },
        });

        expect(await statusOf(SCRIPT)).toEqual(['approved']);
        expect(
            await statusOf(
                { ...SCRIPT, workspaceId: 'ws-2' },
                { ...SCRIPT, level: 'folder' },
                { ...SCRIPT, event: 'onResponse' },
                { ...SCRIPT, source: 'console.log(2)' },
            ),
        ).toEqual(['unapproved', 'unapproved', 'unapproved', 'unapproved']);

        open('other');
        expect(await statusOf(SCRIPT)).toEqual(['unapproved']);
    });

    it('lets a key go on over a text that was empty or already approved there', async () => {
        const typed = { ...SCRIPT, source: 'console.log(1);' };

        await expect(
            ipc.call(CHANNELS.scriptsApprove, { ...typed, previousSource: '' }),
        ).resolves.toMatchObject({ value: { approved: true } });

        await ipc.call(CHANNELS.scriptsApprove, SCRIPT);

        const next = { ...SCRIPT, source: 'console.log(12)', previousSource: SCRIPT.source };

        await expect(ipc.call(CHANNELS.scriptsApprove, next)).resolves.toMatchObject({
            value: { approved: true },
        });
    });

    it('does not wash with a key a text that came from outside after the status was read', async () => {
        const before = await approvalsFile();
        const pulled = { ...SCRIPT, source: 'fetch("https://evil.test")' };
        const typed = {
            ...SCRIPT,
            source: 'fetch("https://evil.test");',
            previousSource: pulled.source,
        };

        await expect(ipc.call(CHANNELS.scriptsApprove, typed)).resolves.toEqual({
            ok: true,
            value: { approved: false },
        });
        expect(await approvalsFile()).toBe(before);
        expect(await statusOf({ ...SCRIPT, source: typed.source })).toEqual(['unapproved']);
    });

    it('does not take a previous text that is approved somewhere else', async () => {
        await ipc.call(CHANNELS.scriptsApprove, { ...SCRIPT, workspaceId: 'ws-2' });

        await expect(
            ipc.call(CHANNELS.scriptsApprove, {
                ...SCRIPT,
                source: 'x',
                previousSource: SCRIPT.source,
            }),
        ).resolves.toMatchObject({ value: { approved: false } });
    });

    it('says too large for a text over the limit, in bytes, and writes nothing', async () => {
        const huge = { ...SCRIPT, source: 'x'.repeat(SCRIPT_LIMITS.sourceBytes + 1) };
        const euros = {
            ...SCRIPT,
            source: '€'.repeat(Math.ceil(SCRIPT_LIMITS.sourceBytes / 3) + 1),
        };

        expect(euros.source.length).toBeLessThan(SCRIPT_LIMITS.sourceBytes);
        expect(await statusOf(huge, euros, SCRIPT)).toEqual(['tooLarge', 'tooLarge', 'unapproved']);
        await expect(ipc.call(CHANNELS.scriptsApprove, huge)).resolves.toMatchObject({
            value: { approved: false },
        });
        await expect(
            ipc.call(CHANNELS.scriptsApprove, {
                ...SCRIPT,
                source: 'x',
                previousSource: euros.source,
            }),
        ).resolves.toMatchObject({ value: { approved: false } });
        expect(await approvalsFile()).toBe('');
    });

    it('refuses a list of more than the limit, and a field it does not know', async () => {
        const many = Array.from({ length: SCRIPTS_STATUS_MAX + 1 }, () => SCRIPT);

        await expect(ipc.call(CHANNELS.scriptsStatus, { scripts: many })).resolves.toMatchObject({
            ok: false,
        });
        await expect(
            ipc.call(CHANNELS.scriptsApprove, { ...SCRIPT, origin: 'local' }),
        ).resolves.toMatchObject({ ok: false });
    });

    it('answers a refusal while no origin is open', async () => {
        setActiveOrigin(null);

        await expect(ipc.call(CHANNELS.scriptsApprove, SCRIPT)).resolves.toMatchObject({
            ok: false,
        });
        await expect(
            ipc.call(CHANNELS.scriptsStatus, { scripts: [SCRIPT] }),
        ).resolves.toMatchObject({
            ok: false,
        });
    });

    it('forgets every approval, and every value a script set', async () => {
        const place = { origin: 'local', workspaceId: 'ws-1', environmentId: null };

        variables.apply(place, variables.generation(place), [{ name: 'a', value: '1' }]);
        await ipc.call(CHANNELS.scriptsApprove, SCRIPT);
        await expect(ipc.call(CHANNELS.scriptsForget, {})).resolves.toEqual({
            ok: true,
            value: {},
        });

        expect(await statusOf(SCRIPT)).toEqual(['unapproved']);
        expect(variables.values(place)).toEqual({});
        await expect(ipc.call(CHANNELS.scriptsForget, { all: true })).resolves.toMatchObject({
            ok: false,
        });
    });
});

describe('clearing what scripts set', () => {
    it('clears the workspace asked, in the origin open, and leaves the others', async () => {
        const here = { origin: 'local', workspaceId: 'ws-1', environmentId: 'env' };
        const other = { ...here, workspaceId: 'ws-2' };
        const elsewhere = { ...here, origin: 'other' };

        for (const place of [here, other, elsewhere]) {
            variables.apply(place, variables.generation(place), [{ name: 'a', value: '1' }]);
        }

        await expect(
            ipc.call(CHANNELS.scriptsClearVariables, { workspaceId: 'ws-1' }),
        ).resolves.toEqual({ ok: true, value: {} });
        expect(variables.values(here)).toEqual({});
        expect(variables.values(other)).toEqual({ a: '1' });
        expect(variables.values(elsewhere)).toEqual({ a: '1' });
    });

    it('refuses a request without a workspace, and answers a refusal with no origin open', async () => {
        await expect(ipc.call(CHANNELS.scriptsClearVariables, {})).resolves.toMatchObject({
            ok: false,
        });
        setActiveOrigin(null);
        await expect(
            ipc.call(CHANNELS.scriptsClearVariables, { workspaceId: 'ws-1' }),
        ).resolves.toMatchObject({ ok: false });
    });
});

describe('the switch of the scripts', () => {
    it('is on, and turning it off stays after a restart', async () => {
        await expect(ipc.call(CHANNELS.scriptsSwitchRead)).resolves.toEqual({
            ok: true,
            value: { enabled: true },
        });
        await expect(ipc.call(CHANNELS.scriptsSwitchWrite, { enabled: false })).resolves.toEqual({
            ok: true,
            value: {},
        });
        await expect(ipc.call(CHANNELS.scriptsSwitchRead, {})).resolves.toEqual({
            ok: true,
            value: { enabled: false },
        });
        expect((await createScriptsSwitch(userData)).enabled()).toBe(false);
        await expect(
            ipc.call(CHANNELS.scriptsSwitchWrite, { enabled: 'no' }),
        ).resolves.toMatchObject({
            ok: false,
        });
        await expect(ipc.call(CHANNELS.scriptsSwitchRead, { x: 1 })).resolves.toMatchObject({
            ok: false,
        });
    });

    it('does not unapprove anything when it is off', async () => {
        await ipc.call(CHANNELS.scriptsApprove, SCRIPT);
        await ipc.call(CHANNELS.scriptsSwitchWrite, { enabled: false });

        expect(await statusOf(SCRIPT)).toEqual(['approved']);
    });
});

describe('opening the scripts of a run', () => {
    it('gives the approvals and a switch that is on until someone turns it off', async () => {
        const opened = await openScripts(userData, 'script-worker.js');

        expect(opened.scriptsSwitch.enabled()).toBe(true);
        await opened.approvals.approve('a'.repeat(64));
        expect(await opened.approvals.isApproved('a'.repeat(64))).toBe(true);
        opened.close();
    });

    it('refuses every chain once the run closed its workers', async () => {
        const opened = await openScripts(userData, 'script-worker.js');

        opened.close();

        await expect(opened.startChain({}).run('{}')).resolves.toEqual({
            ok: false,
            error: { message: 'The script workers are closed', errorName: 'Closed' },
        });
    });
});

describe('the registration', () => {
    it('answers the six channels and releases them all', () => {
        const channels = [
            CHANNELS.scriptsApprove,
            CHANNELS.scriptsStatus,
            CHANNELS.scriptsForget,
            CHANNELS.scriptsSwitchRead,
            CHANNELS.scriptsSwitchWrite,
            CHANNELS.scriptsClearVariables,
        ];

        expect(ipc.registered()).toEqual(expect.arrayContaining(channels));
        dispose();
        expect(ipc.registered()).toEqual([]);
    });
});
