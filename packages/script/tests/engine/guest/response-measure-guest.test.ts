import { beforeAll, describe, expect, it } from 'vitest';

import { newWasmModule, type WasmModule } from '../../../src/engine/wasm-module.js';
import { textOf } from '../../support/line-of.js';
import { answerTo, JSON_ANSWER } from './response-to-support.js';
import { fails, HOLDS, outputAt } from './support.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

/** Each row: a statement of Postman's chai, the answer the guest gives, and the response it reads. */
describe('mandor.response.to, on the measures and the schema', () => {
    describe('the time and the size, read to go on about the number or called with one', () => {
        it.each([
            [
                'responseTime read alone asserts nothing',
                'mandor.response.to.not.have.responseTime',
                HOLDS,
                {},
            ],
            [
                'responseTime() asks for a number',
                'mandor.response.to.have.responseTime()',
                HOLDS,
                {},
            ],
            ['responseTime called with it', 'mandor.response.to.have.responseTime(5)', HOLDS, {}],
            [
                'responseTime called with another',
                'mandor.response.to.have.responseTime(6)',
                fails('expected response to have a valid response time but got 5'),
                {},
            ],
            ['responseTime.below', 'mandor.response.to.have.responseTime.below(500)', HOLDS, {}],
            [
                'responseTime.above, past it',
                'mandor.response.to.have.responseTime.above(500)',
                fails('expected 5 to be above 500'),
                {},
            ],
            [
                'not, on a time',
                'mandor.response.to.not.have.responseTime()',
                fails('expected response to not have a valid response time but got 5'),
                {},
            ],
            [
                'responseSize counts each header line and the bytes of the body as they came',
                'mandor.response.to.have.responseSize(32 + 9)',
                HOLDS,
                { bodyBytes: 9 },
            ],
            [
                'responseSize called with another',
                'mandor.response.to.have.responseSize(1)',
                fails('expected response size to equal 1 but got 32'),
                {},
            ],
            [
                'not, with its size',
                'mandor.response.to.not.have.responseSize(32)',
                fails('expected response size to not equal 32'),
                {},
            ],
            [
                'not, with no size',
                'mandor.response.to.not.have.responseSize()',
                fails('expected response to not have a valid response size but got 32'),
                {},
            ],
            ['responseSize.below', 'mandor.response.to.have.responseSize.below(1024)', HOLDS, {}],
        ])('%s', async (_name, statement, answer, response) => {
            expect(await answerTo(wasm, statement, response)).toBe(answer);
        });
    });

    describe('the JSON of the body against a JSON Schema', () => {
        const SCHEMA =
            '{ type: "object", required: ["id"], properties: { id: { type: "number" } } }';

        it.each([
            ['a body that meets it', `mandor.response.to.have.jsonSchema(${SCHEMA})`, HOLDS, {}],
            [
                'a body that does not',
                `mandor.response.to.have.jsonSchema(${SCHEMA})`,
                fails(
                    'expected data to satisfy schema but found following errors: \ndata/id must be number',
                ),
                { text: '{"id":"7"}' },
            ],
            [
                'not, on a body that meets it',
                `mandor.response.to.not.have.jsonSchema(${SCHEMA})`,
                fails('expected data to not satisfy schema'),
                {},
            ],
            [
                'a schema that is no object',
                'mandor.response.to.have.jsonSchema("object")',
                'TypeError: jsonSchema expects a schema object',
                {},
            ],
            [
                'a schema the checker cannot read',
                'mandor.response.to.have.jsonSchema({ type: 7 })',
                expect.stringMatching(/^TypeError: jsonSchema cannot read the schema: ./u),
                {},
            ],
            [
                'a body that is no JSON',
                `mandor.response.to.have.jsonSchema(${SCHEMA})`,
                fails(
                    "expected response body to be a valid json but got error SyntaxError: unexpected token: 'pong'",
                ),
                { text: 'pong' },
            ],
        ])('%s', async (_name, statement, answer, response) => {
            expect(await answerTo(wasm, statement, response)).toEqual(answer);
        });

        it('does not leave the check of the worker in reach of the script', async () => {
            const output = await outputAt(
                wasm,
                'onResponse',
                'console.log(typeof globalThis.mandorSchemaCheck);',
                { response: { ...JSON_ANSWER, bodyBytes: 0, timeMs: 5 } },
            );

            expect(output.logs.map(textOf)).toEqual(['undefined']);
        });
    });
});
