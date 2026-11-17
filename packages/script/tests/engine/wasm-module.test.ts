import { describe, expect, it } from 'vitest';

import { SCRIPT_LIMITS } from '../../src/limits/script-limits.js';
import { newWasmModule } from '../../src/engine/wasm-module.js';

describe('newWasmModule', () => {
    it('gives a module that makes a fresh runtime each time', async () => {
        const wasm = await newWasmModule();
        const first = wasm.newRuntime();
        const second = wasm.newRuntime();

        expect(first).not.toBe(second);

        first.dispose();
        second.dispose();
    });

    it('loads the variant and evaluates with it', async () => {
        const wasm = await newWasmModule();
        const runtime = wasm.newRuntime();
        const context = runtime.newContext();
        const handle = context.unwrapResult(context.evalCode('1 + 1'));

        expect(context.getNumber(handle)).toBe(2);

        handle.dispose();
        context.dispose();
        runtime.dispose();
    });

    it('lives in a memory that cannot grow past the limit, which a variant memory of its own would', async () => {
        const wasm = await newWasmModule();
        const memory = wasm.getWasmMemory();

        expect(memory.buffer.byteLength).toBeLessThan(SCRIPT_LIMITS.memoryBytes);
        expect(() => memory.grow(SCRIPT_LIMITS.memoryBytes / 65_536)).toThrow(RangeError);
    });

    it('gives each module a memory of its own, so two instances never share bytes', async () => {
        const [first, second] = await Promise.all([newWasmModule(), newWasmModule()]);

        expect(first.getWasmMemory()).not.toBe(second.getWasmMemory());
    });
});
