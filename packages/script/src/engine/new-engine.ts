import type { ScriptRunInput } from '../contract/script-run.js';
import type { SendLink } from '../contract/worker-message.js';

import { runScript, type ScriptRunResult } from './run-script.js';
import { newWasmModule } from './wasm-module.js';

/**
 * Runs scripts, one after another, over a single WASM instance. Each script starts clean. With a
 * `link` the script may send requests, which main answers over it; without one it has no way out.
 */
export type Engine = {
    runScript(input: ScriptRunInput, link?: SendLink): Promise<ScriptRunResult>;
};

/** The entry of `@mandor/script/engine`, which only the worker that runs scripts loads. */
export async function newEngine(): Promise<Engine> {
    const wasm = await newWasmModule();

    return {
        runScript: (input, link) => runScript(wasm, input, { link }),
    };
}
