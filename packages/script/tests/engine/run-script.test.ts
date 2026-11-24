import { beforeAll, describe, expect, it } from 'vitest';

import { runScript } from '../../src/engine/run-script.js';
import { newWasmModule, type WasmModule } from '../../src/engine/wasm-module.js';
import { inputOf, outputOf } from './guest/support.js';
import { lineOf } from '../support/line-of.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

describe('runScript', () => {
    it('gives an empty output for an empty script', async () => {
        expect(await outputOf(wasm, '')).toEqual({ effects: [], logs: [], tests: [] });
    });

    it('gives what the script wrote, in the order it wrote it', async () => {
        const output = await outputOf(
            wasm,
            'console.log("a"); mandor.variables.set("x", "1"); console.warn("b");',
        );

        expect(output.logs).toEqual([
            { level: 'log', text: 'a' },
            { level: 'warn', text: 'b' },
        ]);
        expect(output.effects).toEqual([{ kind: 'var', name: 'x', value: '1' }]);
    });

    it('lets the script wait for a promise and end with return', async () => {
        const output = await outputOf(
            wasm,
            'const value = await Promise.resolve("later"); console.log(value); return 1;',
        );

        expect(output.logs).toEqual([{ level: 'log', text: 'later' }]);
        expect(output).not.toHaveProperty('error');
    });

    it('reports a throw as the error of the output, with the line of the script', async () => {
        const output = await outputOf(
            wasm,
            'console.log("before");\n\nthrow new TypeError("boom");',
        );

        expect(output.error).toMatchObject({ message: 'boom', errorName: 'TypeError', line: 3 });
        expect(output.logs).toEqual([{ level: 'log', text: 'before' }]);
    });

    it('keeps the effects that came before the throw', async () => {
        const output = await outputOf(
            wasm,
            'mandor.variables.set("a", "1"); throw new Error("x");',
        );

        expect(output.effects).toEqual([{ kind: 'var', name: 'a', value: '1' }]);
    });

    it('reports a rejected promise as the error of the output', async () => {
        const output = await outputOf(wasm, 'await Promise.reject(new RangeError("late"));');

        expect(output.error).toMatchObject({ message: 'late', errorName: 'RangeError' });
    });

    it('reports a thrown value that is no error by its text, with no line', async () => {
        const output = await outputOf(wasm, 'throw 7;');

        expect(output.error).toEqual({ message: '7', errorName: 'Error' });
    });

    it('reports a thrown value that cannot be read as such', async () => {
        const output = await outputOf(wasm, 'throw { toString() { throw 1; } };');

        expect(output.error).toEqual({
            message: 'The error could not be read',
            errorName: 'ErrorUnreadable',
        });
    });

    it('reports a syntax error with its line in the script, when it is inside the script', async () => {
        const output = await outputOf(wasm, 'console.log(1);\nlet = ;');

        expect(output.error).toMatchObject({ errorName: 'SyntaxError', line: 2 });
        expect(output.logs).toEqual([]);
    });

    it('gives no line to a syntax error that is not in the script', async () => {
        const output = await outputOf(wasm, 'console.log(1);\nif (true) {');

        expect(output.error?.errorName).toBe('SyntaxError');
        expect(output.error).not.toHaveProperty('line');
        expect(output.error).not.toHaveProperty('column');
    });

    it('gives the line of an error the engine throws, inside the script', async () => {
        const output = await outputOf(wasm, 'null.x;');

        expect(output.error).toMatchObject({ errorName: 'TypeError', line: 1 });
    });

    it('says a script that waits for something that never comes did not finish', async () => {
        const output = await outputOf(wasm, 'await new Promise(() => {});');

        expect(output.error).toMatchObject({ errorName: 'ScriptPending' });
    });

    it('starts every script on a clean global', async () => {
        await outputOf(wasm, 'globalThis.kept = "yes";');

        expect(lineOf((await outputOf(wasm, 'console.log(typeof globalThis.kept);')).logs[0])).toBe(
            'undefined',
        );
    });

    it('shows the script none of the names of the guest that runs it', async () => {
        const output = await outputOf(
            wasm,
            'console.log([typeof I, typeof OUT, typeof SNAPSHOT, typeof finish].join(","));',
        );

        expect(lineOf(output.logs[0])).toBe('undefined,undefined,undefined,undefined');
    });

    it('does not trust the text the guest ends on', async () => {
        const forge = (text: string): string =>
            `}\n});\n})(() => 1);\n"x" ? ${JSON.stringify(text)} : (function (run) { return run(async function () {\n{`;

        for (const text of ['not json', '{"effects":1}', '{}']) {
            const result = await runScript(wasm, inputOf(forge(text)));

            expect(result).toMatchObject({
                ok: true,
                output: { error: { errorName: 'OutputInvalid' } },
            });
        }
    });

    it('keeps the user from a snapshot that was not given: variables are only the snapshot', async () => {
        const output = await outputOf(wasm, 'console.log(String(mandor.variables.get("a")));', {
            variables: [{ name: 'a', value: '1' }],
        });

        expect(lineOf(output.logs[0])).toBe('1');
    });

    describe('faults of the instance', () => {
        it('reports a script that uses up its time as a fault of the instance', async () => {
            const result = await runScript(wasm, inputOf('while (true) {}'), { runMs: 50 });

            expect(result).toMatchObject({ ok: false, fault: 'timeout' });
        });

        it('reports a timeout even when the script catches what stops it', async () => {
            const result = await runScript(wasm, inputOf('try { while (true) {} } catch (e) {}'), {
                runMs: 50,
            });

            expect(result).toMatchObject({ ok: false, fault: 'timeout' });
        });

        it('reports the memory used up by the script as a fault', async () => {
            const source = 'const keep = []; for (;;) { keep.push(new Array(100000).fill(1)); }';

            expect(await runScript(wasm, inputOf(source))).toMatchObject({
                ok: false,
                fault: 'memory',
            });
        });

        it('reports a trap of the instance as a fault', async () => {
            const broken: WasmModule = {
                newRuntime: () => {
                    throw new WebAssembly.RuntimeError('unreachable');
                },
            };

            expect(await runScript(broken, inputOf(''))).toMatchObject({
                ok: false,
                fault: 'trap',
            });
        });
    });

    it('leaves no handle alive after many runs of every kind', async () => {
        for (let index = 0; index < 10; index += 1) {
            await outputOf(wasm, 'console.log(1);');
            await outputOf(wasm, 'throw new Error("x");');
            await outputOf(wasm, 'let = ;');
            await outputOf(wasm, 'await new Promise(() => {});');
        }

        expect((await outputOf(wasm, '')).logs).toEqual([]);
    });
});
