import { beforeAll, describe, expect, it } from 'vitest';

import { runSource } from '../../src/engine/run-source.js';
import { newWasmModule, type WasmModule } from '../../src/engine/wasm-module.js';

let engine: WasmModule;

beforeAll(async () => {
    engine = await newWasmModule();
});

describe('runSource', () => {
    it('returns the string the source ends on', async () => {
        expect(await runSource(engine, '"hello"')).toEqual({ ok: true, value: 'hello' });
    });

    it('returns the JSON text a script builds', async () => {
        const result = await runSource(engine, 'JSON.stringify({ a: [1, 2], b: "é" })');

        expect(result).toEqual({ ok: true, value: '{"a":[1,2],"b":"é"}' });
    });

    it.each([
        ['a number', '42'],
        ['undefined', 'undefined'],
        ['null', 'null'],
        ['an object', '({ a: 1 })'],
        ['a function', '(function () {})'],
        ['a symbol', 'Symbol("x")'],
        ['a big integer', '1n'],
        ['a boolean', 'true'],
    ])('refuses %s: only a string crosses', async (_name, source) => {
        const result = await runSource(engine, source);

        expect(result.ok).toBe(false);
        expect(result.ok ? '' : result.error.errorName).toBe('ResultNotString');
    });

    it('reports a throw as text with its name, line and column', async () => {
        const result = await runSource(engine, '\n\n  throw new TypeError("boom");');

        expect(result).toEqual({
            ok: false,
            error: {
                message: 'boom',
                errorName: 'TypeError',
                line: 3,
                column: expect.any(Number) as number,
            },
        });
    });

    it('reports a syntax error as text', async () => {
        const result = await runSource(engine, 'let = ;');

        expect(result.ok ? '' : result.error.errorName).toBe('SyntaxError');
    });

    it('reports a thrown value that is no error', async () => {
        const result = await runSource(engine, 'throw 7');

        expect(result).toEqual({ ok: false, error: { message: '7', errorName: 'Error' } });
    });

    it('reports a thrown object by its text', async () => {
        const result = await runSource(engine, 'throw { toString() { return "custom"; } }');

        expect(result.ok ? '' : result.error.message).toBe('custom');
    });

    it('reports an error it cannot read when the thrown value fails to become text', async () => {
        const result = await runSource(engine, 'throw { toString() { throw 1; } }');

        expect(result).toEqual({
            ok: false,
            error: { message: 'The error could not be read', errorName: 'ErrorUnreadable' },
        });
    });

    it('reports the same error even when the script replaces String and JSON.stringify', async () => {
        const result = await runSource(
            engine,
            'String = () => "forged"; JSON.stringify = () => "forged"; throw new RangeError("real")',
        );

        expect(result.ok ? '' : result.error).toMatchObject({
            message: 'real',
            errorName: 'RangeError',
        });
    });

    it('reports a trap of the instance as a fault, apart from a throw of the script', async () => {
        const broken = {
            newRuntime: () => {
                throw new WebAssembly.RuntimeError('unreachable');
            },
        } as unknown as WasmModule;

        expect(await runSource(broken, '"x"')).toEqual({
            ok: false,
            error: { message: 'RuntimeError: unreachable', errorName: 'EngineTrap' },
            fault: 'trap',
        });
    });

    it('starts every run on a clean global', async () => {
        await runSource(engine, 'globalThis.leak = "kept"; "x"');
        const second = await runSource(engine, 'typeof globalThis.leak');

        expect(second).toEqual({ ok: true, value: 'undefined' });
    });

    it('leaves no handle alive: a leak would abort the runtime on dispose', async () => {
        for (let index = 0; index < 20; index += 1) {
            expect((await runSource(engine, '"ok"')).ok).toBe(true);
            expect((await runSource(engine, 'throw new Error("x")')).ok).toBe(false);
            expect((await runSource(engine, '42')).ok).toBe(false);
        }
    });

    describe('with a promise', () => {
        it('returns the string a promise is fulfilled with, after the jobs that wait for it', async () => {
            const result = await runSource(
                engine,
                '(async () => { await null; return "late"; })()',
            );

            expect(result).toEqual({ ok: true, value: 'late' });
        });

        it('reports a promise that is rejected as a throw', async () => {
            const result = await runSource(
                engine,
                '(async () => { throw new RangeError("late"); })()',
            );

            expect(result.ok ? '' : result.error).toMatchObject({
                message: 'late',
                errorName: 'RangeError',
            });
        });

        it('says a promise that is never settled is no result', async () => {
            const result = await runSource(engine, 'new Promise(() => {})');

            expect(result).toEqual({
                ok: false,
                error: {
                    message: 'The script did not finish: it waits for something that cannot come',
                    errorName: 'ScriptPending',
                },
            });
        });

        it('refuses a promise fulfilled with something that is no string', async () => {
            const result = await runSource(engine, 'Promise.resolve(1)');

            expect(result.ok ? '' : result.error.errorName).toBe('ResultNotString');
        });
    });

    it('counts the lines of the error from the window it is given', async () => {
        const result = await runSource(engine, '\n\nthrow new Error("x")', undefined, {
            lines: { offset: 2, lines: 1 },
        });

        expect(result.ok ? '' : result.error).toMatchObject({ line: 1 });
    });

    describe('with a rescue', () => {
        const never = 'globalThis.rescueNow = () => "rescued"; new Promise(() => {})';

        it('evaluates it when the promise stays pending, and gives what it answers', async () => {
            expect(await runSource(engine, never, undefined, { rescue: 'rescueNow()' })).toEqual({
                ok: true,
                value: 'rescued',
            });
        });

        it('does not evaluate it when the promise settles', async () => {
            const source = 'globalThis.rescueNow = () => "rescued"; Promise.resolve("own")';

            expect(await runSource(engine, source, undefined, { rescue: 'rescueNow()' })).toEqual({
                ok: true,
                value: 'own',
            });
        });

        it('reports a rescue that throws, and one that gives no string', async () => {
            const thrown = await runSource(engine, never, undefined, {
                rescue: 'throw new Error("r")',
            });
            const number = await runSource(engine, never, undefined, { rescue: '1' });

            expect(thrown.ok ? '' : thrown.error.message).toBe('r');
            expect(number.ok ? '' : number.error.errorName).toBe('ResultNotString');
        });
    });
});
