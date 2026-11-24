import { beforeAll, describe, expect, it } from 'vitest';

import { newWasmModule, type WasmModule } from '../../../src/engine/wasm-module.js';
import { fails, HOLDS, thrownBy } from './support.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

async function answerTo(statement: string): Promise<string> {
    return await thrownBy(wasm, statement);
}

describe('expect of the guest: corpus of properties, sizes and flags', () => {
    describe('property', () => {
        it.each([
            ['an own property', 'mandor.expect({ a: 1 }).to.have.property("a")', HOLDS],
            [
                'an inherited property counts',
                'mandor.expect(Object.create({ a: 1 })).to.have.property("a")',
                HOLDS,
            ],
            [
                'a property that is not there',
                'mandor.expect({ a: 1 }).to.have.property("b")',
                fails('expected {"a":1} to have property "b"'),
            ],
            [
                'a property with its value',
                'mandor.expect({ a: 1 }).to.have.property("a", 1)',
                HOLDS,
            ],
            [
                'a property with another value',
                'mandor.expect({ a: 1 }).to.have.property("a", 2)',
                fails('expected {"a":1} to have property "a" of 2'),
            ],
            [
                'a property that holds undefined',
                'mandor.expect({ a: undefined }).to.have.property("a", undefined)',
                HOLDS,
            ],
            ['a property of a string', 'mandor.expect("ab").to.have.property("length", 2)', HOLDS],
            [
                'null has none',
                'mandor.expect(null).to.have.property("a")',
                fails('expected null to have property "a"'),
            ],
            [
                'undefined has none',
                'mandor.expect(undefined).to.have.property("a")',
                fails('expected undefined to have property "a"'),
            ],
            ['not property', 'mandor.expect({ a: 1 }).to.not.have.property("b")', HOLDS],
        ])('%s', async (_name, statement, answer) => {
            expect(await answerTo(statement)).toBe(answer);
        });
    });

    describe('lengthOf, above and below', () => {
        it.each([
            ['the length of an array', 'mandor.expect([1, 2]).to.have.lengthOf(2)', HOLDS],
            ['the length of a string', 'mandor.expect("abc").to.have.lengthOf(3)', HOLDS],
            [
                'another length',
                'mandor.expect([1]).to.have.lengthOf(2)',
                fails('expected [1] to have length of 2'),
            ],
            [
                'an object with no length',
                'mandor.expect({}).to.have.lengthOf(0)',
                fails('expected {} to have length of 0'),
            ],
            [
                'null has no length',
                'mandor.expect(null).to.have.lengthOf(0)',
                fails('expected null to have length of 0'),
            ],
            ['above', 'mandor.expect(2).to.be.above(1)', HOLDS],
            [
                'not above the same',
                'mandor.expect(1).to.be.above(1)',
                fails('expected 1 to be above 1'),
            ],
            ['below', 'mandor.expect(1).to.be.below(2)', HOLDS],
            [
                'not below the same',
                'mandor.expect(1).to.be.below(1)',
                fails('expected 1 to be below 1'),
            ],
            [
                'NaN is neither',
                'mandor.expect(NaN).to.be.above(0)',
                fails('expected NaN to be above 0'),
            ],
            [
                'a string is no number',
                'mandor.expect("5").to.be.above(1)',
                fails('expected "5" to be above 1'),
            ],
        ])('%s', async (_name, statement, answer) => {
            expect(await answerTo(statement)).toBe(answer);
        });
    });

    describe('the flags', () => {
        it.each([
            ['true', 'mandor.expect(true).to.be.true', HOLDS],
            ['true is no 1', 'mandor.expect(1).to.be.true', fails('expected 1 to be true')],
            ['false', 'mandor.expect(false).to.be.false', HOLDS],
            ['false is no 0', 'mandor.expect(0).to.be.false', fails('expected 0 to be false')],
            ['null', 'mandor.expect(null).to.be.null', HOLDS],
            [
                'null is no undefined',
                'mandor.expect(undefined).to.be.null',
                fails('expected undefined to be null'),
            ],
            ['undefined', 'mandor.expect(undefined).to.be.undefined', HOLDS],
            [
                'undefined is no null',
                'mandor.expect(null).to.be.undefined',
                fails('expected null to be undefined'),
            ],
            ['exist, for 0', 'mandor.expect(0).to.exist', HOLDS],
            ['exist, for an empty string', 'mandor.expect("").to.exist', HOLDS],
            [
                'null does not exist',
                'mandor.expect(null).to.exist',
                fails('expected null to exist'),
            ],
            ['not exist', 'mandor.expect(undefined).to.not.exist', HOLDS],
            [
                'not true',
                'mandor.expect(true).to.not.be.true',
                fails('expected true not to be true'),
            ],
        ])('%s', async (_name, statement, answer) => {
            expect(await answerTo(statement)).toBe(answer);
        });
    });
});
