import { beforeAll, describe, expect, it } from 'vitest';

import { TEST_GUEST } from '../../../src/engine/guest/test-guest.js';
import { newWasmModule, type WasmModule } from '../../../src/engine/wasm-module.js';
import { outputOf } from './support.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

async function casesOf(source: string) {
    return (await outputOf(wasm, source)).tests;
}

describe('test of the guest', () => {
    it('is plain text with nothing that would break the assembly of the source', () => {
        expect(TEST_GUEST).not.toMatch(/`|\$\{/u);
    });

    it('counts a case that holds, with no message', async () => {
        expect(await casesOf('test("holds", () => {});')).toEqual([
            { name: 'holds', passed: true },
        ]);
    });

    it('counts a case that throws, with what it threw', async () => {
        const [only] = await casesOf('test("breaks", () => { throw new TypeError("bad"); });');

        expect(only).toEqual({ name: 'breaks', passed: false, message: 'TypeError: bad' });
    });

    it('counts a case that throws something that is no error', async () => {
        const [only] = await casesOf('test("breaks", () => { throw 7; });');

        expect(only).toEqual({ name: 'breaks', passed: false, message: '7' });
    });

    it('counts every case, even when another one throws', async () => {
        const tests = await casesOf(
            'test("a", () => { throw new Error("x"); }); test("b", () => {}); test("c", () => { throw 1; });',
        );

        expect(tests.map(({ name, passed }) => [name, passed])).toEqual([
            ['a', false],
            ['b', true],
            ['c', false],
        ]);
    });

    it('waits for an async case, whether the script awaits it or not', async () => {
        const tests = await casesOf(
            'test("late", async () => { await null; await null; }); test("bad", async () => { await null; throw new Error("late"); });',
        );

        expect(tests).toEqual([
            { name: 'late', passed: true },
            { name: 'bad', passed: false, message: 'Error: late' },
        ]);
    });

    it('lets the script await the case and go on after it', async () => {
        const output = await outputOf(
            wasm,
            'await test("a", async () => { await null; }); console.log("after");',
        );

        expect(output.tests).toEqual([{ name: 'a', passed: true }]);
        expect(output.logs).toEqual([{ level: 'log', text: 'after' }]);
    });

    it('keeps the order the cases were declared in, not the order they ended in', async () => {
        const tests = await casesOf(
            'test("slow", async () => { for (let i = 0; i < 5; i += 1) { await null; } }); test("fast", () => {});',
        );

        expect(tests.map(({ name }) => name)).toEqual(['slow', 'fast']);
    });

    it('marks a case that never ends as not finished, and the run still gives its output', async () => {
        const output = await outputOf(
            wasm,
            'test("hangs", () => new Promise(() => {})); test("ok", () => {}); console.log("end");',
        );

        expect(output.tests).toEqual([
            { name: 'hangs', passed: false, message: 'The case did not finish' },
            { name: 'ok', passed: true },
        ]);
        expect(output.logs).toEqual([{ level: 'log', text: 'end' }]);
        expect(output).not.toHaveProperty('error');
    });

    it('keeps the cases of a script that then waits for something that never comes', async () => {
        const output = await outputOf(wasm, 'test("a", () => {}); await new Promise(() => {});');

        expect(output.tests).toEqual([{ name: 'a', passed: true }]);
        expect(output.error).toMatchObject({ errorName: 'ScriptPending' });
    });

    it('keeps the cases of a script that throws, and its error', async () => {
        const output = await outputOf(wasm, 'test("a", () => {}); throw new RangeError("after");');

        expect(output.tests).toEqual([{ name: 'a', passed: true }]);
        expect(output.error).toMatchObject({ message: 'after', errorName: 'RangeError' });
    });

    it('keeps the error of a script that throws while a case never ends', async () => {
        const output = await outputOf(
            wasm,
            'test("hangs", () => new Promise(() => {})); throw new RangeError("after");',
        );

        expect(output.tests).toEqual([
            { name: 'hangs', passed: false, message: 'The case did not finish' },
        ]);
        expect(output.error).toMatchObject({ message: 'after', errorName: 'RangeError' });
    });

    it('reads the name as the console would show it', async () => {
        expect(
            await casesOf(
                'test(12, () => {}); test(undefined, () => {}); test({ a: 1 }, () => {});',
            ),
        ).toEqual([
            { name: '12', passed: true },
            { name: 'undefined', passed: true },
            { name: '{"a":1}', passed: true },
        ]);
    });

    it('counts a case whose body is no function', async () => {
        const [only] = await casesOf('test("no body", 5);');

        expect(only?.passed).toBe(false);
        expect(only?.message).toMatch(/^TypeError/u);
    });

    it('lets a case run the cases that follow it from inside', async () => {
        const tests = await casesOf('test("outer", () => { test("inner", () => {}); });');

        expect(tests.map(({ name, passed }) => [name, passed])).toEqual([
            ['outer', true],
            ['inner', true],
        ]);
    });

    describe('when the script replaces what the cases use', () => {
        it.each([
            ['Promise.resolve', 'Promise.resolve = () => { throw new Error("forged"); };'],
            [
                'Promise.prototype.then',
                'Promise.prototype.then = () => { throw new Error("forged"); };',
            ],
            [
                'globalThis.Promise',
                'globalThis.Promise = function () { throw new Error("forged"); };',
            ],
        ])('keeps the count when it replaces %s', async (_name, pisa) => {
            expect(await casesOf(`${pisa}\ntest("a", async () => { await null; });`)).toEqual([
                { name: 'a', passed: true },
            ]);
        });
    });
});
