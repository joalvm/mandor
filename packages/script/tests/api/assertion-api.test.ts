import { beforeAll, describe, expect, it } from 'vitest';

import { ASSERTION_API } from '../../src/api/assertion-api.js';
import { newWasmModule, type WasmModule } from '../../src/engine/wasm-module.js';
import { lineOf } from '../engine/guest/support.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

describe('ASSERTION_API', () => {
    it('names every word the guest of expect gives, and no other', async () => {
        const found = JSON.parse(
            await lineOf(wasm, 'JSON.stringify(Object.getOwnPropertyNames(mandor.expect(1)))'),
        ) as string[];

        expect(found.sort()).toEqual(ASSERTION_API.map(({ name }) => name).sort());
    });

    it('gives a verb a signature and its parameters, and a word read as a property neither', () => {
        for (const word of ASSERTION_API) {
            expect(word.signature === undefined).toBe(word.kind !== 'verb');
            expect(word.parameters.length > 0).toBe(word.kind === 'verb');
        }
    });

    it('explains the chain words with one text, and each other word with its own', () => {
        const chain = ASSERTION_API.filter(({ kind, name }) => kind === 'chain' && name !== 'not');
        const rest = ASSERTION_API.filter((word) => !chain.includes(word));

        expect(new Set(chain.map(({ docKey }) => docKey))).toEqual(
            new Set(['script.assertion.chain']),
        );
        expect(rest.map(({ docKey }) => docKey)).toEqual(
            rest.map(({ name }) => `script.assertion.${name}`),
        );
    });
});
