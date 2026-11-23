import { beforeAll, describe, expect, it } from 'vitest';

import { newWasmModule, type WasmModule } from '../../../src/engine/wasm-module.js';

import { answeringLink, linkedOutput, okReply, outputAt, type RecordedLink } from './support.js';
import { lineOf } from '../../support/line-of.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

async function logs(link: RecordedLink, source: string): Promise<ReturnType<typeof lineOf>[]> {
    return (await linkedOutput(wasm, link, source)).logs.map(lineOf);
}

function payloads(link: RecordedLink): unknown[] {
    return link.sent.map(({ payload }) => JSON.parse(payload) as unknown);
}

describe('sendRequest', () => {
    it('sends the request as text and resolves with the answer as a response', async () => {
        const link = answeringLink(() => okReply('{"a":1}', 201));
        const lines = await logs(
            link,
            `const r = await mandor.sendRequest({ url: 'https://a.test/x', method: 'POST', headers: { 'X-A': 1 }, body: 'hi' });
console.log(r.status, r.time, r.text(), r.json().a, r.headers.get('Content-Type'));`,
        );

        expect(lines).toEqual(['201 12 {"a":1} 1 text/plain']);
        expect(payloads(link)).toEqual([
            {
                url: 'https://a.test/x',
                method: 'POST',
                headers: [{ name: 'X-A', value: '1' }],
                body: 'hi',
            },
        ]);
    });

    it('defaults to GET with no headers and no body, and accepts headers as a list', async () => {
        const link = answeringLink(() => okReply(undefined));

        await logs(link, "await mandor.sendRequest({ url: 'https://a.test' });");
        await logs(
            link,
            "await mandor.sendRequest({ url: 'https://a.test', headers: [{ name: 'A', value: 'b' }] });",
        );

        expect(payloads(link)).toEqual([
            { url: 'https://a.test', method: 'GET', headers: [] },
            { url: 'https://a.test', method: 'GET', headers: [{ name: 'A', value: 'b' }] },
        ]);
    });

    it('says once that a body too large to read is not there', async () => {
        const link = answeringLink(() => okReply(undefined));

        expect(
            await logs(
                link,
                `const r = await mandor.sendRequest({ url: 'https://a.test' });
console.log(String(r.text()), String(r.json()));`,
            ),
        ).toEqual([{ level: 'warn', notice: 'response-body-unreadable' }, 'undefined undefined']);
    });

    it('rejects with the reason main gives', async () => {
        const link = answeringLink(() =>
            JSON.stringify({ ok: false, message: 'connection refused' }),
        );

        expect(
            await logs(
                link,
                `try { await mandor.sendRequest({ url: 'https://a.test' }); } catch (e) { console.log(e.name + ': ' + e.message); }`,
            ),
        ).toEqual(['Error: connection refused']);
    });

    it.each([['undefined'], ['null'], ['"text"'], ['{}'], ['{ url: 5 }']])(
        'rejects %s without sending anything',
        async (options) => {
            const link = answeringLink(() => okReply('x'));
            const lines = await logs(
                link,
                `try { await mandor.sendRequest(${options}); } catch (e) { console.log(e.name); }`,
            );

            expect(lines).toEqual(['TypeError']);
            expect(link.sent).toEqual([]);
        },
    );

    it('rejects a list of headers that holds something else than headers', async () => {
        const link = answeringLink(() => okReply('x'));
        const lines = await logs(
            link,
            `try { await mandor.sendRequest({ url: 'https://a.test', headers: [null] }); } catch (e) { console.log('rejected'); }`,
        );

        expect(lines).toEqual(['rejected']);
        expect(link.sent).toEqual([]);
    });

    it('does not leave the way out in reach of the script', async () => {
        const link = answeringLink(() => okReply('x'));

        expect(await logs(link, 'console.log(typeof globalThis.mandorSend);')).toEqual([
            'undefined',
        ]);
    });

    it('rejects where the run has no link to main', async () => {
        const output = await outputAt(
            wasm,
            'onBeforeRequest',
            `mandor.sendRequest({ url: 'https://a.test' }).catch((e) => console.log(e.message));`,
        );

        expect(output.logs.map(lineOf)).toEqual(['sendRequest is not available here']);
    });

    it('waits for several at once, and asks main to wait once for each', async () => {
        const link = answeringLink((payload) =>
            okReply((JSON.parse(payload) as { url: string }).url),
        );
        const lines = await logs(
            link,
            `const [a, b] = await Promise.all([
    mandor.sendRequest({ url: 'one' }),
    mandor.sendRequest({ url: 'two' }),
]);
console.log(a.text(), b.text());`,
        );

        expect(lines).toEqual(['one two']);
        expect(link.sent.map(({ sendId }) => sendId)).toEqual(['1', '2']);
        expect(link.waits).toBe(2);
    });
});
