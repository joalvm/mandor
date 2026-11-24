import { beforeAll, describe, expect, it } from 'vitest';

import { DEEP_EQUAL_GUEST } from '../../../src/engine/guest/deep-equal-guest.js';
import { newWasmModule, type WasmModule } from '../../../src/engine/wasm-module.js';
import { fails, HOLDS, thrownBy } from './support.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

async function answerTo(statement: string): Promise<string> {
    return await thrownBy(wasm, statement);
}

describe('eql of the guest: corpus of edge cases', () => {
    it('is plain text with nothing that would break the assembly of the source', () => {
        expect(DEEP_EQUAL_GUEST).not.toMatch(/`|\$\{/u);
    });

    describe('eql compares the own enumerable keys', () => {
        it.each([
            [
                'nested equal values',
                'mandor.expect({ a: 1, b: [1, { c: 2 }] }).to.eql({ a: 1, b: [1, { c: 2 }] })',
                HOLDS,
            ],
            [
                'other value',
                'mandor.expect({ a: 1 }).to.eql({ a: 2 })',
                fails('expected {"a":1} to deeply equal {"a":2}'),
            ],
            ['NaN is equal to NaN', 'mandor.expect(NaN).to.eql(NaN)', HOLDS],
            [
                '-0 is not equal to 0',
                'mandor.expect(-0).to.eql(0)',
                fails('expected -0 to deeply equal 0'),
            ],
            ['NaN inside an object', 'mandor.expect({ n: NaN }).to.eql({ n: NaN })', HOLDS],
            [
                'undefined in an object is a key',
                'mandor.expect({ a: undefined }).to.eql({})',
                fails('expected {} to deeply equal {}'),
            ],
            [
                'the same undefined key on both sides',
                'mandor.expect({ a: undefined }).to.eql({ a: undefined })',
                HOLDS,
            ],
            [
                'order of keys does not count',
                'mandor.expect({ a: 1, b: 2 }).to.eql({ b: 2, a: 1 })',
                HOLDS,
            ],
            [
                'inherited keys do not count',
                'mandor.expect(Object.create({ a: 1 })).to.eql({})',
                HOLDS,
            ],
            [
                'inherited keys are not own',
                'mandor.expect(Object.create({ a: 1 })).to.eql({ a: 1 })',
                fails('expected {} to deeply equal {"a":1}'),
            ],
            [
                'the prototype does not count',
                'class P { constructor() { this.a = 1; } } mandor.expect(new P()).to.eql({ a: 1 })',
                HOLDS,
            ],
            [
                'an array and an object',
                'mandor.expect([1, 2]).to.eql({ 0: 1, 1: 2 })',
                fails('expected [1,2] to deeply equal {"0":1,"1":2}'),
            ],
            [
                'arrays of another length',
                'mandor.expect([1]).to.eql([1, undefined])',
                fails('expected [1] to deeply equal [1,null]'),
            ],
            [
                'a hole is not an undefined',
                'mandor.expect([, 1]).to.eql([undefined, 1])',
                fails('expected [null,1] to deeply equal [null,1]'),
            ],
            ['equal dates', 'mandor.expect(new Date(0)).to.eql(new Date(0))', HOLDS],
            [
                'other dates',
                'mandor.expect(new Date(0)).to.eql(new Date(1))',
                fails(
                    'expected "1970-01-01T00:00:00.000Z" to deeply equal "1970-01-01T00:00:00.001Z"',
                ),
            ],
            [
                'invalid dates are equal',
                'mandor.expect(new Date(NaN)).to.eql(new Date(NaN))',
                HOLDS,
            ],
            [
                'a date and an object',
                'mandor.expect(new Date(0)).to.eql({})',
                fails('expected "1970-01-01T00:00:00.000Z" to deeply equal {}'),
            ],
            ['equal patterns', 'mandor.expect(/a/g).to.eql(/a/g)', HOLDS],
            [
                'other flags',
                'mandor.expect(/a/).to.eql(/a/i)',
                fails('expected /a/ to deeply equal /a/i'),
            ],
            ['boxed numbers', 'mandor.expect(new Number(1)).to.eql(new Number(1))', HOLDS],
            [
                'other boxed numbers',
                'mandor.expect(new Number(1)).to.eql(new Number(2))',
                fails('expected 1 to deeply equal 2'),
            ],
            [
                'a Map is equal only to itself',
                'mandor.expect(new Map()).to.eql(new Map())',
                fails('expected {} to deeply equal {}'),
            ],
            ['the same Map', 'const m = new Map(); mandor.expect(m).to.eql(m)', HOLDS],
            [
                'an Error is equal only to itself',
                'mandor.expect(new Error("x")).to.eql(new Error("x"))',
                fails('expected Error: x to deeply equal Error: x'),
            ],
            [
                'another function',
                'mandor.expect(() => 1).to.eql(() => 1)',
                fails('expected () => 1 to deeply equal () => 1'),
            ],
            [
                'a cycle on both sides',
                'const a = { n: 1 }; a.me = a; const b = { n: 1 }; b.me = b; mandor.expect(a).to.eql(b)',
                HOLDS,
            ],
            [
                'a cycle that differs',
                'const a = { n: 1 }; a.me = a; const b = { n: 2 }; b.me = b; mandor.expect(a).to.eql(b)',
                fails(
                    'expected {"n":1,"me":"[Circular]"} to deeply equal {"n":2,"me":"[Circular]"}',
                ),
            ],
            [
                'a cycle against none',
                'const a = { n: 1 }; a.me = a; mandor.expect(a).to.eql({ n: 1, me: { n: 1 } })',
                fails('expected {"n":1,"me":"[Circular]"} to deeply equal {"n":1,"me":{"n":1}}'),
            ],
            [
                'null and undefined',
                'mandor.expect(null).to.eql(undefined)',
                fails('expected null to deeply equal undefined'),
            ],
        ])('%s', async (_name, statement, answer) => {
            expect(await answerTo(statement)).toBe(answer);
        });
    });
});
