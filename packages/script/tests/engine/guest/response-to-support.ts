import type { WasmModule } from '../../../src/engine/wasm-module.js';
import { textOf } from '../../support/line-of.js';

import { outputAt } from './support.js';

type Answer = {
    status: number;
    headers: { name: string; value: string }[];
    text?: string;
    bodyBytes?: number;
};

export const JSON_ANSWER: Answer = {
    status: 200,
    headers: [{ name: 'Content-Type', value: 'application/json' }],
    text: '{"id":7,"items":[{"name":"a"}]}',
};

/** `name: message` of what the statement throws at a response, or `no` when it does not. */
export async function answerTo(
    wasm: WasmModule,
    statement: string,
    answer: Partial<Answer> = {},
): Promise<string> {
    const source = `try { ${statement}; console.log("no"); } catch (e) { console.log(e.name + ": " + e.message); }`;
    const response = { ...JSON_ANSWER, bodyBytes: 0, timeMs: 5, ...answer };
    const output = await outputAt(wasm, 'onResponse', source, { response });

    return textOf(output.logs.at(-1));
}
