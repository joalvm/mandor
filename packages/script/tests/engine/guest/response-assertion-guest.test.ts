import { beforeAll, describe, expect, it } from 'vitest';

import { RESPONSE_ASSERTION_GUEST } from '../../../src/engine/guest/response-assertion-guest.js';
import { RESPONSE_BODY_GUEST } from '../../../src/engine/guest/response-body-guest.js';
import { newWasmModule, type WasmModule } from '../../../src/engine/wasm-module.js';
import { textOf } from '../../support/line-of.js';
import { fails, HOLDS, outputAt } from './support.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

type Answer = { status: number; headers: { name: string; value: string }[]; text?: string };

const JSON_ANSWER: Answer = {
    status: 200,
    headers: [{ name: 'Content-Type', value: 'application/json' }],
    text: '{"id":7,"items":[{"name":"a"}]}',
};

/** `name: message` of what the statement throws at a response, or `no` when it does not. */
async function answerTo(statement: string, answer: Partial<Answer> = {}): Promise<string> {
    const source = `try { ${statement}; console.log("no"); } catch (e) { console.log(e.name + ": " + e.message); }`;
    const response = { ...JSON_ANSWER, bodyBytes: 0, timeMs: 5, ...answer };
    const output = await outputAt(wasm, 'onResponse', source, { response });

    return textOf(output.logs.at(-1));
}

/** Each row: a statement of Postman's chai, the answer the guest gives, and the response it reads. */
describe('mandor.response.to', () => {
    it('is plain text with nothing that would break the assembly of the source', () => {
        expect(RESPONSE_ASSERTION_GUEST).not.toMatch(/`|\$\{/u);
        expect(RESPONSE_BODY_GUEST).not.toMatch(/`|\$\{/u);
    });

    describe('the status, by its code, its class and its reason', () => {
        it.each([
            ['the code it has', 'mandor.response.to.have.status(200)', HOLDS, {}],
            [
                'a code it has not',
                'mandor.response.to.have.status(201)',
                fails('expected response to have status code 201 but got 200'),
                {},
            ],
            [
                'not, on the code it has',
                'mandor.response.to.not.have.status(200)',
                fails('expected response to not have status code 200'),
                {},
            ],
            ['a text is the reason', 'mandor.response.to.have.status("OK")', HOLDS, {}],
            [
                'a reason it has not',
                'mandor.response.to.have.statusReason("Created")',
                fails('expected response to have status reason "Created" but got "OK"'),
                {},
            ],
            ['statusCode', 'mandor.response.to.have.statusCode(404)', HOLDS, { status: 404 }],
            [
                'statusCodeClass',
                'mandor.response.to.have.statusCodeClass(5)',
                HOLDS,
                { status: 503 },
            ],
            ['the class flag', 'mandor.response.to.be.success', HOLDS, {}],
            [
                'a class it is not in',
                'mandor.response.to.be.clientError',
                fails('expected response code to be 4XX but found 200'),
                {},
            ],
            ['a named code', 'mandor.response.to.be.notFound', HOLDS, { status: 404 }],
            [
                'a named code it has not',
                'mandor.response.to.be.ok',
                fails('expected response to have status code 200 but got 404'),
                { status: 404 },
            ],
            ['error is 4XX or 5XX', 'mandor.response.to.be.error', HOLDS, { status: 500 }],
            [
                'not error, on one',
                'mandor.response.to.not.be.error',
                fails('expected response code to not be 4XX or 5XX'),
                { status: 401 },
            ],
            [
                'the chain words say nothing',
                'mandor.response.to.be.ok.and.have.status(200)',
                HOLDS,
                {},
            ],
        ])('%s', async (_name, statement, answer, response) => {
            expect(await answerTo(statement, response)).toBe(answer);
        });
    });

    describe('the headers, by name without regard to case', () => {
        it.each([
            ['one it carries', 'mandor.response.to.have.header("content-type")', HOLDS],
            [
                'one it does not',
                'mandor.response.to.have.header("X-Id")',
                fails("expected response to have header with key 'X-Id'"),
            ],
            ['not, on one it does not', 'mandor.response.to.not.have.header("X-Id")', HOLDS],
            [
                'with its value',
                'mandor.response.to.have.header("Content-Type", "application/json")',
                HOLDS,
            ],
            [
                'with another value',
                'mandor.response.to.have.header("Content-Type", "text/plain")',
                fails(
                    'expected \'Content-Type\' response header to be "text/plain" but got "application/json"',
                ),
            ],
            [
                'not, with its value',
                'mandor.response.to.not.have.header("Content-Type", "application/json")',
                fails('expected \'Content-Type\' response header to not be "application/json"'),
            ],
        ])('%s', async (_name, statement, answer) => {
            expect(await answerTo(statement)).toBe(answer);
        });
    });

    describe('the body, as text, as a pattern and as JSON', () => {
        it.each([
            ['withBody on a body', 'mandor.response.to.have.withBody', HOLDS, {}],
            [
                'withBody on none',
                'mandor.response.to.have.withBody',
                fails('expected response to have content in body'),
                { text: '' },
            ],
            [
                'body() with nothing is withBody',
                'mandor.response.to.not.have.body()',
                HOLDS,
                { text: '' },
            ],
            [
                'body(text) equals it',
                'mandor.response.to.have.body("pong")',
                HOLDS,
                { text: 'pong' },
            ],
            [
                'body(text) that differs',
                'mandor.response.to.have.body("pong")',
                fails('expected response body to equal "pong" but got "ping"'),
                { text: 'ping' },
            ],
            ['body(pattern)', 'mandor.response.to.have.body(/"id":\\d+/)', HOLDS, {}],
            [
                'body(object) deep equals the JSON',
                'mandor.response.to.have.body({ id: 7, items: [{ name: "a" }] })',
                HOLDS,
                {},
            ],
            [
                'body(object) that differs',
                'mandor.response.to.have.body({ id: 8 })',
                fails(
                    'expected response body json to equal {"id":8} but got {"id":7,"items":[{"name":"a"}]}',
                ),
                {},
            ],
            ['json on JSON', 'mandor.response.to.be.json', HOLDS, {}],
            ['not json on text', 'mandor.response.to.not.be.json', HOLDS, { text: 'pong' }],
            [
                'jsonBody with a path',
                'mandor.response.to.have.jsonBody("items[0].name")',
                HOLDS,
                {},
            ],
            [
                'jsonBody with a path and its value',
                'mandor.response.to.have.jsonBody("items[0].name", "a")',
                HOLDS,
                {},
            ],
            [
                'jsonBody with a path it has not',
                'mandor.response.to.have.jsonBody("items[1].name")',
                fails(
                    'expected {"id":7,"items":[{"name":"a"}]} in response to contain property "items[1].name"',
                ),
                {},
            ],
            [
                'jsonBody with another value',
                'mandor.response.to.have.jsonBody("id", 8)',
                fails('expected response body json at "id" to contain 8 but got 7'),
                {},
            ],
            [
                'jsonBody with an object',
                'mandor.response.to.have.jsonBody({ id: 7, items: [{ name: "a" }] })',
                HOLDS,
                {},
            ],
            [
                'jsonBody on a body that is no JSON',
                'mandor.response.to.have.jsonBody("id")',
                fails(
                    "expected response body to be a valid json but got error SyntaxError: unexpected token: 'pong'",
                ),
                { text: 'pong' },
            ],
        ])('%s', async (_name, statement, answer, response) => {
            expect(await answerTo(statement, response)).toBe(answer);
        });
    });

    it('fails a test with the message of Postman, as expect does', async () => {
        const output = await outputAt(
            wasm,
            'onResponse',
            'mandor.test("is created", () => { mandor.response.to.have.status(201); });',
            { response: { ...JSON_ANSWER, bodyBytes: 0, timeMs: 5 } },
        );

        expect(output.tests).toEqual([
            expect.objectContaining({
                name: 'is created',
                passed: false,
                message: 'AssertionError: expected response to have status code 201 but got 200',
            }),
        ]);
    });
});
