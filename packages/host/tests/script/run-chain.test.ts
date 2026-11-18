import { SCRIPT_LIMITS } from '@mandor/script';
import { afterEach, describe, expect, it } from 'vitest';

import { runChain } from '../../src/script/run-chain.js';
import { createScriptVariables } from '../../src/script/script-variables.js';
import { forgetSessionSecrets, rememberSessionSecrets } from '../../src/secret/session-secrets.js';
import { PLACE, depsOf, runOf, script } from './fixtures/chain-runs.js';

afterEach(() => {
    forgetSessionSecrets();
});

describe('runChain', () => {
    it('runs each script on the photo the one before left, and keeps what they set', async () => {
        const deps = depsOf();
        const result = await runChain(
            runOf([
                script('vars.set("a", "1")', 'Shop'),
                script('console.log(vars.get("a")); vars.set("b", "2")', 'Orders'),
            ]),
            deps,
        );

        expect(result.logs).toEqual([{ level: 'log', text: '1' }]);
        expect(result.effects).toEqual([
            { kind: 'var', name: 'a', value: '1' },
            { kind: 'var', name: 'b', value: '2' },
        ]);
        expect(deps.variables.values(PLACE)).toEqual({ a: '1', b: '2' });
        expect(result.variables).toEqual([
            { name: 'a', preview: '1' },
            { name: 'b', preview: '2' },
        ]);
        expect(result.error).toBeUndefined();
        expect(deps.started()).toBe(1);
    });

    it('skips a script nobody approved, tells it, and asks for no worker for it', async () => {
        const deps = depsOf({ approvals: { isApproved: () => Promise.resolve(false) } });
        const result = await runChain(runOf([script('vars.set("a", "1")')]), deps);

        expect(result.skipped).toEqual([
            {
                name: 'Orders',
                level: 'folder',
                event: 'onBeforeRequest',
                bytes: 18,
                source: 'vars.set("a", "1")',
            },
        ]);
        expect(deps.variables.values(PLACE)).toEqual({});
        expect(deps.started()).toBe(0);
    });

    it('leaves out a script switched off, as if it were not there', async () => {
        const deps = depsOf();
        const off = { ...script('vars.set("a", "1")'), enabled: false };
        const result = await runChain(runOf([off]), deps);

        expect(result).toMatchObject({ effects: [], logs: [], skipped: [], switchedOff: 0 });
        expect(deps.started()).toBe(0);
    });

    /** The window says it in its own language from the count: main adds no line of its own. */
    it('runs nothing and asks for no worker while the switch of this machine is off', async () => {
        const deps = depsOf({ scriptsSwitch: { enabled: () => false } });
        const result = await runChain(runOf([script('a()'), script('b()')]), deps);

        expect(result.switchedOff).toBe(2);
        expect(result.logs).toEqual([]);
        expect(deps.started()).toBe(0);
    });

    it('runs none of a chain over the limit of scripts', async () => {
        const deps = depsOf();
        const count = SCRIPT_LIMITS.chainScripts + 1;
        const entries = Array.from({ length: count }, () => script('vars.set("a", "1")'));
        const result = await runChain(runOf(entries), deps);

        expect(result.logs).toEqual([
            {
                level: 'warn',
                notice: 'chain-too-long',
                params: { scripts: count, limit: SCRIPT_LIMITS.chainScripts },
            },
        ]);
        expect(result.switchedOff).toBe(0);
        expect(deps.started()).toBe(0);
        expect(deps.variables.values(PLACE)).toEqual({});
    });

    it('ends on the first error, says where, and keeps what the scripts before it set', async () => {
        const deps = depsOf();
        const result = await runChain(
            runOf([
                script('vars.set("a", "1")', 'Shop'),
                script('vars.set("b", "2"); throw new Error("boom")', 'Orders'),
                script('vars.set("c", "3")', 'Last'),
            ]),
            deps,
        );

        expect(result.error).toMatchObject({
            message: 'boom',
            level: 'folder',
            event: 'onBeforeRequest',
            name: 'Orders',
        });
        expect(result.effects).toEqual([{ kind: 'var', name: 'a', value: '1' }]);
        expect(deps.variables.values(PLACE)).toEqual({ a: '1' });
    });

    it('keeps nothing of a script whose values do not fit, and says so', async () => {
        const variables = createScriptVariables({ ...SCRIPT_LIMITS, variables: 1 });
        const deps = depsOf({ variables });
        const result = await runChain(
            runOf([script('vars.set("a", "1"); vars.set("b", "2")')]),
            deps,
        );

        expect(result.logs).toContainEqual({
            level: 'warn',
            notice: 'variables-full',
        });
        expect(variables.values(PLACE)).toEqual({});
    });

    it('writes down a trap of the engine, and the person sees the error all the same', async () => {
        const trap = { message: 'unreachable', errorName: 'EngineTrap' };
        const deps = depsOf({
            startChain: () => ({
                run: () => Promise.resolve({ ok: false, error: trap }),
                close: () => undefined,
            }),
        });
        const result = await runChain(runOf([script('a()')]), deps);

        expect(result.error).toMatchObject({ ...trap, name: 'Orders', level: 'folder' });
        expect(deps.lines).toEqual([
            [
                'error',
                'the engine of scripts trapped in onBeforeRequest of the folder Orders: unreachable',
            ],
        ]);
    });

    it('hides the secrets of the session in every line, test, error and value that leaves', async () => {
        rememberSessionSecrets(['s3cr3t']);

        const deps = depsOf();
        const result = await runChain(
            runOf([
                script('vars.set("t", "s3cr3t"); console.log("s3cr3t"); test("s3cr3t", () => {})'),
                script('throw new Error("s3cr3t")'),
            ]),
            deps,
        );

        expect(result.error).toBeDefined();
        expect(result.variables.map(({ name }) => name)).toEqual(['t']);
        expect(result.tests).toHaveLength(1);
        // The effects stay in main: they carry the value the send needs, and never reach the window.
        const { effects, ...leaves } = result;

        expect(effects).toEqual([{ kind: 'var', name: 't', value: 's3cr3t' }]);
        expect(JSON.stringify(leaves)).not.toContain('s3cr3t');
    });
});
