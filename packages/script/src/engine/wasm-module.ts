import variantModule from '@jitl/quickjs-singlefile-cjs-release-sync';
import {
    newQuickJSWASMModuleFromVariant,
    newVariant,
    type QuickJSWASMModule,
} from 'quickjs-emscripten-core';

import { SCRIPT_LIMITS } from '../limits/script-limits.js';

import { unwrapVariant } from './unwrap-variant.js';

export type WasmModule = QuickJSWASMModule;

const PAGE_BYTES = 65_536;
const INITIAL_BYTES = 16 * 1024 * 1024;

/**
 * The memory the WASM instance of a script lives in. Its `maximum` is the one thing that stops a
 * script that allocates without end: `setMemoryLimit` alone does not (issues 271 and 255 of
 * quickjs-emscripten), and the memory the variant makes for itself has no maximum at all.
 */
function newWasmMemory(): WebAssembly.Memory {
    return new WebAssembly.Memory({
        initial: INITIAL_BYTES / PAGE_BYTES,
        maximum: SCRIPT_LIMITS.memoryBytes / PAGE_BYTES,
    });
}

/** The WASM instance of QuickJS, in a memory of its own with a maximum. It lives as long as its worker. */
export function newWasmModule(): Promise<WasmModule> {
    const variant = newVariant(unwrapVariant(variantModule), { wasmMemory: newWasmMemory() });

    return newQuickJSWASMModuleFromVariant(variant);
}
