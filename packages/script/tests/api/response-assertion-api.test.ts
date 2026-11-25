import { beforeAll, describe, expect, it } from 'vitest';

import { RESPONSE_ASSERTION_API } from '../../src/api/response-assertion-api.js';
import { newWasmModule, type WasmModule } from '../../src/engine/wasm-module.js';
import { textOf } from '../support/line-of.js';
import { outputAt } from '../engine/guest/support.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

const RESPONSE = { status: 200, headers: [], text: '', bodyBytes: 0, timeMs: 1 };

describe('RESPONSE_ASSERTION_API', () => {
    it('names every word the guest of response.to gives, and no other', async () => {
        const output = await outputAt(
            wasm,
            'onResponse',
            'console.log(JSON.stringify(Object.getOwnPropertyNames(mandor.response.to)));',
            { response: RESPONSE },
        );
        const found = JSON.parse(textOf(output.logs[0])) as string[];

        expect(found.sort()).toEqual(RESPONSE_ASSERTION_API.map(({ name }) => name).sort());
    });

    it('gives a word that is called a signature and its parameters, and the rest neither', () => {
        for (const word of RESPONSE_ASSERTION_API) {
            const called = word.kind === 'verb' || word.kind === 'measure';

            expect(word.signature === undefined).toBe(!called);
            expect(word.parameters.length > 0).toBe(called);
        }
    });

    it('explains the chain words as expect does, and each other word with its own text', () => {
        const chain = RESPONSE_ASSERTION_API.filter(({ kind }) => kind === 'chain');
        const rest = RESPONSE_ASSERTION_API.filter((word) => !chain.includes(word));

        expect(new Set(chain.map(({ docKey }) => docKey))).toEqual(
            new Set(['script.assertion.not', 'script.assertion.chain']),
        );
        expect(rest.map(({ docKey }) => docKey)).toEqual(
            rest.map(({ name }) => `script.responseAssertion.${name}`),
        );
    });
});
