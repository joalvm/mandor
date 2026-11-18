import { describe, expect, it } from 'vitest';

import { runSource } from '../../src/engine/run-source.js';
import type { RunResult } from '../../src/engine/session.js';
import { newWasmModule } from '../../src/engine/wasm-module.js';
import { SCRIPT_LIMITS } from '../../src/limits/script-limits.js';

// Each attack runs on an instance of its own: one that hit its memory limit or trapped is the one
// the worker throws away, so no test leans on it afterwards.
async function attack(source: string, runMs?: number): Promise<RunResult> {
    const wasm = await newWasmModule();

    return await runSource(wasm, source, runMs);
}

function fault(result: RunResult): string | undefined {
    return result.ok ? undefined : result.fault;
}

describe('a loop that never ends', () => {
    it('is stopped by the clock of the guest at the run limit', async () => {
        const started = performance.now();
        const result = await attack('while (true) {}');

        expect(fault(result)).toBe('timeout');
        expect(performance.now() - started).toBeLessThan(SCRIPT_LIMITS.runMs + 2_000);
    });

    it('is stopped when the loop lives in a callback', async () => {
        expect(fault(await attack('[1].forEach(function spin() { for (;;) {} }); "x"', 300))).toBe(
            'timeout',
        );
    });

    it('is stopped when it spins in the jobs of a promise', async () => {
        const source =
            'Promise.resolve().then(function again() { Promise.resolve().then(again); }); "x"';

        expect(fault(await attack(source, 300))).toBe('timeout');
    });

    it('is stopped when a catch swallows the interrupt and the loop goes on', async () => {
        const source = 'for (;;) { try { for (;;) {} } catch (error) {} }';

        expect(fault(await attack(source, 300))).toBe('timeout');
    });

    // The spin is bounded so that, were the clock blind to it, the run would still end and fail
    // here instead of hanging the test file.
    it.each([
        ['a getter of the message', 'throw { get message() { SPIN; return "m"; } }'],
        ['the text of the thrown value', 'throw { toString() { SPIN; return "m"; } }'],
    ])('is stopped when it spins in %s, read after the throw', async (_name, source) => {
        const spin = 'const end = Date.now() + 1500; while (Date.now() < end) {}';

        expect(fault(await attack(source.replace('SPIN', spin), 300))).toBe('timeout');
    });
});

describe('a regex that backtracks forever', () => {
    it('is stopped by the clock of the guest, which the regex engine asks as it goes', async () => {
        const source = '/^(a+)+$/.test("a".repeat(60) + "b") ? "yes" : "no"';
        const result = await attack(source, 300);

        expect(result).toEqual({
            ok: false,
            error: {
                message: 'The script ran longer than 300 ms',
                errorName: 'Timeout',
                limit: 300,
            },
            fault: 'timeout',
        });
    });
});

describe('memory', () => {
    it('stays under the maximum of the instance while a bomb pushes 1 MB at a time', async () => {
        const wasm = await newWasmModule();
        const memory = wasm.getWasmMemory();
        const source =
            'const keep = []; for (;;) { keep.push("x".repeat(1 << 20) + keep.length); }';
        const result = await runSource(wasm, source, 20_000);

        expect(fault(result)).toBe('memory');
        expect(memory.buffer.byteLength).toBeLessThanOrEqual(SCRIPT_LIMITS.memoryBytes);
    });

    it('stays under the maximum while a bomb fills arrays', async () => {
        const wasm = await newWasmModule();
        const memory = wasm.getWasmMemory();
        const result = await runSource(
            wasm,
            'const keep = []; for (;;) { keep.push(new Array(100000).fill(1)); }',
            20_000,
        );

        expect(fault(result)).toBe('memory');
        expect(memory.buffer.byteLength).toBeLessThanOrEqual(SCRIPT_LIMITS.memoryBytes);
    });

    it('refuses a 1 GiB string before it allocates it, as an error of the script', async () => {
        const result = await attack("'x'.repeat(2 ** 30)");

        expect(result).toEqual({
            ok: false,
            error: {
                message: 'invalid string length',
                errorName: 'RangeError',
                line: 1,
                column: 11,
            },
        });
    });

    it('refuses a JSON text bigger than the memory', async () => {
        const result = await attack('JSON.stringify(new Array(5000000).fill("0123456789"))');

        expect(fault(result)).toBe('memory');
    });

    it('runs a script after another script that used most of the memory and let it go', async () => {
        const wasm = await newWasmModule();

        expect(
            (await runSource(wasm, 'const big = "x".repeat(30 << 20); big.length > 0 ? "a" : "b"'))
                .ok,
        ).toBe(true);
        expect(await runSource(wasm, '"after"')).toEqual({ ok: true, value: 'after' });
    });
});

describe('the stack', () => {
    it('ends an endless recursion as an error of the script, not a trap', async () => {
        const result = await attack('function f() { return f() + 1; } f()');

        expect(result.ok).toBe(false);
        expect(fault(result)).toBeUndefined();
        expect(result.ok ? '' : result.error.message).toMatch(/stack/iu);
    });

    it('survives the recursion: the same instance runs the next script', async () => {
        const wasm = await newWasmModule();

        await runSource(wasm, 'function f() { return f() + 1; } f()');

        expect(await runSource(wasm, '"next"')).toEqual({ ok: true, value: 'next' });
    });
});

describe('a promise that never settles', () => {
    it('ends with a line instead of waiting: nothing can settle it', async () => {
        const result = await attack('new Promise(() => {})');

        expect(result.ok ? '' : result.error.errorName).toBe('ScriptPending');
    });

    it('ends the same when it is an async function that waits forever', async () => {
        const result = await attack('(async () => { await new Promise(() => {}); })()');

        expect(result.ok ? '' : result.error.errorName).toBe('ScriptPending');
    });
});
