import { beforeAll, describe, expect, it } from 'vitest';

import { runSource } from '../../src/engine/run-source.js';
import { newWasmModule, type WasmModule } from '../../src/engine/wasm-module.js';

let engine: WasmModule;

beforeAll(async () => {
    engine = await newWasmModule();
});

async function value(source: string): Promise<string> {
    const result = await runSource(engine, source);

    return result.ok ? result.value : `error:${result.error.errorName}`;
}

describe('what a script can reach', () => {
    it.each(['process', 'require', 'fetch', 'WebAssembly', 'Buffer', 'module', 'XMLHttpRequest'])(
        'has no %s',
        async (name) => {
            expect(await value(`typeof ${name}`)).toBe('undefined');
        },
    );

    it('has a global that holds none of the host names', async () => {
        const names = (await value('Object.getOwnPropertyNames(globalThis).join(",")')).split(',');

        for (const forbidden of ['process', 'require', 'fetch', 'WebAssembly', 'setTimeout']) {
            expect(names).not.toContain(forbidden);
        }
    });

    it('cannot open a module with a dynamic import: the promise is refused', () => {
        const runtime = engine.newRuntime();
        const context = runtime.newContext();
        const source =
            'let outcome = "pending"; import("node:fs").then(() => { outcome = "loaded"; }, () => { outcome = "refused"; }); "started"';

        context.unwrapResult(context.evalCode(source)).dispose();
        runtime.executePendingJobs();

        const outcome = context.unwrapResult(context.evalCode('outcome'));

        expect(context.getString(outcome)).toBe('refused');

        outcome.dispose();
        context.dispose();
        runtime.dispose();
    });

    it('cannot import a module statically either', async () => {
        expect(await value('import fs from "node:fs"; "x"')).toMatch(/^error:/u);
    });
});

describe('what the language lends', () => {
    it('gets only the guest Function from constructor.constructor', async () => {
        const result = await value(
            '(function () {}).constructor.constructor("return typeof process")()',
        );

        expect(result).toBe('undefined');
    });

    it('gets only the guest global through the constructor chain', async () => {
        const source =
            '[].constructor.constructor("return globalThis")() === globalThis ? "same" : "other"';

        expect(await value(source)).toBe('same');
    });

    it('lets prepareStackTrace run, and shows it nothing of the host', async () => {
        const source = `
            Error.prepareStackTrace = () => typeof process + typeof require;
            String(new Error("x").stack);
        `;

        expect(await value(source)).not.toMatch(/function|object/u);
    });

    it('lets a Proxy wrap what the guest sees, and sees nothing more', async () => {
        const source = `
            const seen = [];
            const proxy = new Proxy(globalThis, {
                get(target, key) { seen.push(String(key)); return target[key]; },
            });
            proxy.Object; proxy.process;
            JSON.stringify(seen) + typeof proxy.process;
        `;

        expect(await value(source)).toBe('["Object","process"]undefined');
    });

    it('has no way to reach the host from the stack text', async () => {
        const stack = await value('try { null.x } catch (error) { String(error.stack) }');

        expect(stack).not.toMatch(/node:|\.ts:|file:|[\\/]/u);
        expect(stack).toMatch(/script\.js:1:\d+/u);
    });
});
