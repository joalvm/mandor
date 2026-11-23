import { beforeAll, describe, expect, it } from 'vitest';

import type { ScriptRunInput } from '../../../src/contract/script-run.js';
import { EFFECTS_GUEST } from '../../../src/engine/guest/effects-guest.js';
import { LINES_GUEST } from '../../../src/engine/guest/lines-guest.js';
import { LISTS_GUEST } from '../../../src/engine/guest/lists-guest.js';
import { REQUEST_GUEST } from '../../../src/engine/guest/request-guest.js';
import { newWasmModule, type WasmModule } from '../../../src/engine/wasm-module.js';
import { outputAt } from './support.js';
import { lineOf } from '../../support/line-of.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

const REQUEST = {
    url: 'https://api.test/items?id=1',
    method: 'GET',
    headers: [{ name: 'Accept', value: 'text/plain' }],
    query: [{ name: 'id', value: '1' }],
    body: { type: 'json', text: '{"a":1}' },
};

async function run(source: string, request: Partial<typeof REQUEST> | null = REQUEST) {
    return await outputAt(
        wasm,
        'onBeforeRequest',
        source,
        request === null ? {} : { request: request as never },
    );
}

async function at(event: ScriptRunInput['event'], source: string) {
    return await outputAt(wasm, event, source, { request: REQUEST });
}

async function logs(source: string): Promise<ReturnType<typeof lineOf>[]> {
    return (await run(source)).logs.map(lineOf);
}

describe('guests of the request', () => {
    it.each([
        ['LISTS_GUEST', LISTS_GUEST],
        ['EFFECTS_GUEST', EFFECTS_GUEST],
        ['LINES_GUEST', LINES_GUEST],
        ['REQUEST_GUEST', REQUEST_GUEST],
    ])('%s is plain text with nothing that would break the assembly', (_name, guest) => {
        expect(guest).not.toMatch(/`|\$\{/u);
    });
});

describe('request of the guest: reading', () => {
    it('gives the url, the method and the body the snapshot has, with {{var}} as the text it is', async () => {
        const output = await run(
            'console.log(mandor.request.url, mandor.request.method, mandor.request.body);',
            {
                ...REQUEST,
                url: '{{host}}/items',
            },
        );

        expect(output.logs).toEqual([{ level: 'log', text: '{{host}}/items GET {"a":1}' }]);
    });

    it('finds a header whatever the case of its name, and a query line by its exact name', async () => {
        expect(
            await logs(
                'console.log(mandor.request.headers.get("accept"), mandor.request.headers.has("ACCEPT"), mandor.request.headers.get("none"));console.log(mandor.request.query.get("id"), mandor.request.query.get("ID"), mandor.request.query.has("id"));',
            ),
        ).toEqual(['text/plain true undefined', '1 undefined true']);
    });

    it('gives the first of the lines that share a name', async () => {
        const output = await run('console.log(mandor.request.headers.get("x"));', {
            ...REQUEST,
            headers: [
                { name: 'X', value: 'one' },
                { name: 'x', value: 'two' },
            ],
        });

        expect(lineOf(output.logs[0])).toBe('one');
    });

    it('is empty when the snapshot has no request', async () => {
        const output = await run(
            'console.log(JSON.stringify([mandor.request.url, mandor.request.method, mandor.request.body, mandor.request.headers.has("a")]));',
            null,
        );

        expect(lineOf(output.logs[0])).toBe('["","","",false]');
    });

    it('reads a body of a kind a script cannot read as undefined', async () => {
        const output = await run('console.log(mandor.request.body);', {
            ...REQUEST,
            body: { type: 'form', text: 'a=1' },
        });

        expect(lineOf(output.logs[0])).toBe('undefined');
    });
});

describe('request of the guest: writing', () => {
    it('leaves one effect for a field, the last one, and the reads that follow see it', async () => {
        const output = await run(
            'mandor.request.url = "https://one"; mandor.request.url = "https://two"; mandor.request.method = "POST"; console.log(mandor.request.url, mandor.request.method);',
        );

        expect(output.effects).toEqual([
            { kind: 'url', value: 'https://two' },
            { kind: 'method', value: 'POST' },
        ]);
        expect(lineOf(output.logs[0])).toBe('https://two POST');
    });

    it('turns a value into the text the console would show', async () => {
        const output = await run('mandor.request.url = 12;');

        expect(output.effects).toEqual([{ kind: 'url', value: '12' }]);
    });

    it('sets a header with its name in lowercase, and the read finds it', async () => {
        const output = await run(
            'mandor.request.headers.set("X-Token", 7); mandor.request.headers.set("x-token", "b"); console.log(mandor.request.headers.get("X-TOKEN"));',
        );

        expect(output.effects).toEqual([
            { kind: 'header', name: 'x-token', op: 'set', value: 'b' },
        ]);
        expect(lineOf(output.logs[0])).toBe('b');
    });

    it('deletes a header, and a delete after a set takes the place of it', async () => {
        const output = await run(
            'mandor.request.headers.set("X-A", "1"); mandor.request.headers.delete("x-a"); mandor.request.headers.delete("Accept"); console.log(mandor.request.headers.has("accept"), mandor.request.headers.has("x-a"));',
        );

        expect(output.effects).toEqual([
            { kind: 'header', name: 'x-a', op: 'delete' },
            { kind: 'header', name: 'accept', op: 'delete' },
        ]);
        expect(lineOf(output.logs[0])).toBe('false false');
    });

    it('sets and deletes a query line by its exact name', async () => {
        const output = await run(
            'mandor.request.query.set("Page", 2); mandor.request.query.delete("id"); console.log(mandor.request.query.get("Page"), mandor.request.query.get("page"), mandor.request.query.has("id"));',
        );

        expect(output.effects).toEqual([
            { kind: 'query', name: 'Page', op: 'set', value: '2' },
            { kind: 'query', name: 'id', op: 'delete' },
        ]);
        expect(lineOf(output.logs[0])).toBe('2 undefined false');
    });

    it('writes a body with the type it has', async () => {
        const output = await run(
            'mandor.request.body = JSON.stringify({ x: 1 }); console.log(mandor.request.body);',
        );

        expect(output.effects).toEqual([{ kind: 'body', type: 'json', value: '{"x":1}' }]);
        expect(lineOf(output.logs[0])).toBe('{"x":1}');
    });

    it('writes a body as text when the request had none', async () => {
        const output = await run('mandor.request.body = "hello";', {
            url: REQUEST.url,
            method: REQUEST.method,
            headers: REQUEST.headers,
            query: REQUEST.query,
        });

        expect(output.effects).toEqual([{ kind: 'body', type: 'text', value: 'hello' }]);
    });

    it('says a body of another kind cannot be written, and leaves no effect', async () => {
        const output = await run('mandor.request.body = "x";', {
            ...REQUEST,
            body: { type: 'form', text: '' },
        });

        expect(output.effects).toEqual([]);
        expect(output.logs).toEqual([
            { level: 'warn', notice: 'body-not-writable', params: { type: 'form' } },
        ]);
    });
});

describe('request of the guest: what each event lets it write', () => {
    it('does not write what the event does not allow, and says so', async () => {
        const output = await at(
            'onResponse',
            'mandor.request.url = "x"; mandor.request.headers.set("a", "b"); mandor.request.query.delete("id"); mandor.request.body = "z"; mandor.request.method = "PUT"; console.log(mandor.request.url);',
        );

        expect(output.effects).toEqual([]);
        expect(output.logs.map(lineOf)).toEqual([
            {
                level: 'warn',
                notice: 'request-field-readonly',
                params: { field: 'mandor.request.url', event: 'onResponse' },
            },
            {
                level: 'warn',
                notice: 'request-field-readonly',
                params: { field: 'mandor.request.headers', event: 'onResponse' },
            },
            {
                level: 'warn',
                notice: 'request-field-readonly',
                params: { field: 'mandor.request.query', event: 'onResponse' },
            },
            {
                level: 'warn',
                notice: 'request-field-readonly',
                params: { field: 'mandor.request.body', event: 'onResponse' },
            },
            {
                level: 'warn',
                notice: 'request-field-readonly',
                params: { field: 'mandor.request.method', event: 'onResponse' },
            },
            REQUEST.url,
        ]);
    });

    it('lets a connection that opens write the url, the query and the headers, not the method', async () => {
        const output = await at(
            'onBeforeConnect',
            'mandor.request.url = "wss://x"; mandor.request.headers.set("a", "b"); mandor.request.query.set("q", "1"); mandor.request.method = "POST"; mandor.request.body = "z";',
        );

        expect(output.effects.map(({ kind }) => kind)).toEqual(['url', 'header', 'query']);
        expect(output.logs.map(lineOf)).toEqual([
            {
                level: 'warn',
                notice: 'request-field-readonly',
                params: { field: 'mandor.request.method', event: 'onBeforeConnect' },
            },
            {
                level: 'warn',
                notice: 'request-field-readonly',
                params: { field: 'mandor.request.body', event: 'onBeforeConnect' },
            },
        ]);
    });
});
