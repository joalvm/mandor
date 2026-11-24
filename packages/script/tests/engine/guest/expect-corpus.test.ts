import { beforeAll, describe, expect, it } from 'vitest';

import { EXPECT_GUEST } from '../../../src/engine/guest/expect-guest.js';
import { newWasmModule, type WasmModule } from '../../../src/engine/wasm-module.js';
import { fails, HOLDS, thrownBy, outputOf } from './support.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

async function answerTo(statement: string): Promise<string> {
    return await thrownBy(wasm, statement);
}

/** The corpus of `expect`: each row is a statement and the answer the guest gives, written down. */
describe('expect of the guest: corpus of edge cases', () => {
    it('is plain text with nothing that would break the assembly of the source', () => {
        expect(EXPECT_GUEST).not.toMatch(/`|\$\{/u);
    });

    describe('equal compares with the strict operator', () => {
        it.each([
            ['the same number', 'mandor.expect(1).to.equal(1)', HOLDS],
            ['another number', 'mandor.expect(1).to.equal(2)', fails('expected 1 to equal 2')],
            [
                'a string and a number',
                'mandor.expect("1").to.equal(1)',
                fails('expected "1" to equal 1'),
            ],
            [
                'NaN is not equal to NaN',
                'mandor.expect(NaN).to.equal(NaN)',
                fails('expected NaN to equal NaN'),
            ],
            ['-0 is equal to 0', 'mandor.expect(-0).to.equal(0)', HOLDS],
            [
                'two objects that look alike',
                'mandor.expect({}).to.equal({})',
                fails('expected {} to equal {}'),
            ],
            ['the same object', 'const o = {}; mandor.expect(o).to.equal(o)', HOLDS],
            ['not, when it holds', 'mandor.expect(1).not.to.equal(2)', HOLDS],
            [
                'not, when it does not',
                'mandor.expect(1).not.to.equal(1)',
                fails('expected 1 not to equal 1'),
            ],
            ['not twice goes back', 'mandor.expect(1).not.not.to.equal(1)', HOLDS],
            [
                'the chain words say nothing',
                'mandor.expect(1).to.be.that.is.and.have.been.with.of.equal(1)',
                HOLDS,
            ],
        ])('%s', async (_name, statement, answer) => {
            expect(await answerTo(statement)).toBe(answer);
        });
    });

    describe('include', () => {
        it.each([
            ['a part of a string', 'mandor.expect("hello").to.include("ell")', HOLDS],
            [
                'what is not in a string',
                'mandor.expect("hello").to.include("z")',
                fails('expected "hello" to include "z"'),
            ],
            ['an item of an array', 'mandor.expect([1, 2]).to.include(2)', HOLDS],
            [
                'an item that is not in an array',
                'mandor.expect([1, 2]).to.include("2")',
                fails('expected [1,2] to include "2"'),
            ],
            [
                'an array does not find NaN',
                'mandor.expect([NaN]).to.include(NaN)',
                fails('expected [null] to include NaN'),
            ],
            [
                'an array compares objects by reference',
                'mandor.expect([{}]).to.include({})',
                fails('expected [{}] to include {}'),
            ],
            ['a subset of an object', 'mandor.expect({ a: 1, b: 2 }).to.include({ a: 1 })', HOLDS],
            [
                'a subset with another value',
                'mandor.expect({ a: 1 }).to.include({ a: 2 })',
                fails('expected {"a":1} to include {"a":2}'),
            ],
            [
                'a key that is not there',
                'mandor.expect({ a: 1 }).to.include({ b: undefined })',
                fails('expected {"a":1} to include {}'),
            ],
            [
                'a number does not include',
                'mandor.expect(12).to.include(1)',
                fails('expected 12 to include 1'),
            ],
            [
                'a string does not include a number',
                'mandor.expect("a1").to.include(1)',
                fails('expected "a1" to include 1'),
            ],
            ['not include', 'mandor.expect("hello").not.to.include("z")', HOLDS],
        ])('%s', async (_name, statement, answer) => {
            expect(await answerTo(statement)).toBe(answer);
        });
    });

    describe('match', () => {
        it.each([
            ['a string that matches', 'mandor.expect("abc").to.match(/b/)', HOLDS],
            [
                'a string that does not',
                'mandor.expect("abc").to.match(/z/)',
                fails('expected "abc" to match /z/'),
            ],
            [
                'a number is no string',
                'mandor.expect(12).to.match(/1/)',
                fails('expected 12 to match /1/'),
            ],
            [
                'the pattern is not a RegExp',
                'mandor.expect("a").to.match("a")',
                'TypeError: match expects a regular expression',
            ],
            ['not match', 'mandor.expect("abc").not.to.match(/z/)', HOLDS],
        ])('%s', async (_name, statement, answer) => {
            expect(await answerTo(statement)).toBe(answer);
        });
    });

    describe('a, by the type of the value', () => {
        it.each([
            ['string', '"a"', 'string', HOLDS],
            ['number', 'NaN', 'number', HOLDS],
            ['array, not object', '[]', 'array', HOLDS],
            ['object', '{}', 'object', HOLDS],
            ['null, not object', 'null', 'null', HOLDS],
            ['undefined', 'undefined', 'undefined', HOLDS],
            ['function', '() => 1', 'function', HOLDS],
            ['date', 'new Date(0)', 'date', HOLDS],
            ['regexp', '/a/', 'regexp', HOLDS],
            ['boolean', 'false', 'boolean', HOLDS],
            ['an array is no object', '[]', 'object', fails('expected [] to be a "object"')],
            ['a number is no string', '1', 'string', fails('expected 1 to be a "string"')],
        ])('%s', async (_name, value, type, answer) => {
            expect(await answerTo(`mandor.expect(${value}).to.be.a(${JSON.stringify(type)})`)).toBe(
                answer,
            );
            expect(
                await answerTo(`mandor.expect(${value}).to.be.an(${JSON.stringify(type)})`),
            ).toBe(answer.replace(' a ', ' an '));
        });
    });

    describe('inside a case', () => {
        it('turns an assertion that fails into a case that fails, with the same message', async () => {
            const output = await outputOf(
                wasm,
                'mandor.test("a", () => { mandor.expect(1).to.equal(2); }); mandor.test("b", async () => { await null; mandor.expect([1]).to.have.lengthOf(2); });',
            );

            expect(output.tests).toEqual([
                { name: 'a', passed: false, message: fails('expected 1 to equal 2') },
                { name: 'b', passed: false, message: fails('expected [1] to have length of 2') },
            ]);
        });

        it('turns an assertion that holds into a case that holds', async () => {
            const output = await outputOf(
                wasm,
                'mandor.test("a", () => { mandor.expect({ a: 1 }).to.eql({ a: 1 }); });',
            );

            expect(output.tests).toEqual([{ name: 'a', passed: true }]);
        });

        it('ends the script when an assertion fails outside a case', async () => {
            const output = await outputOf(wasm, 'mandor.expect(1).to.equal(2);');

            expect(output.error).toMatchObject({
                errorName: 'AssertionError',
                message: 'expected 1 to equal 2',
                line: 1,
            });
        });
    });

    it('keeps its answers when the script replaces what it uses', async () => {
        const pisa =
            'Object.keys = () => []; Object.prototype.toString = () => "x"; Object.defineProperty = () => {}; Object.prototype.hasOwnProperty = () => false; String.prototype.toLowerCase = () => "x"; JSON.stringify = () => "x"; globalThis.Error = function () {};';

        expect(
            await answerTo(
                `${pisa} mandor.expect({ a: [1, { b: 2 }] }).to.eql({ a: [1, { b: 2 }] })`,
            ),
        ).toBe(HOLDS);
        expect(await answerTo(`${pisa} mandor.expect([]).to.be.a("array")`)).toBe(HOLDS);
        expect(await answerTo(`${pisa} mandor.expect(1).to.equal(2)`)).toBe(
            fails('expected 1 to equal 2'),
        );
    });
});
