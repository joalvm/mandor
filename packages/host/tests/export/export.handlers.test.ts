import { CHANNELS } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { everyNode, openBench, outlineOf, type ExportBench } from './export-bench.js';

let bench: ExportBench;

beforeEach(async () => {
    bench = await openBench();
});

afterEach(async () => {
    await bench.stop();
});

describe('the outline of a workspace', () => {
    it('names the workspace and lists what it holds: its connections and its collections', async () => {
        const answer = await outlineOf(bench);

        expect(answer.ok).toBe(true);
        expect(answer.value.name).toBe('Pasarela');
        expect(everyNode(answer.value.nodes).map((node) => node.label)).toEqual(
            expect.arrayContaining(['produccion', 'registrarPedido', 'consultarPedido']),
        );
    });

    it('bars, with the reason of the format, the kinds it has no place for', async () => {
        const { nodes } = (await outlineOf(bench)).value;
        const barred = everyNode(nodes).filter((node) => node.reason !== undefined);

        expect(barred.map((node) => [node.kind, node.label, node.reason])).toEqual([
            ['request', 'consultarPedido', 'messagesNotHttp'],
        ]);
    });

    it('refuses a format the app did not list', async () => {
        const answer = await bench.ipc.call(CHANNELS.exportOutline, {
            workspaceId: 'pasarela',
            format: 'openapi',
            scope: 'workspace',
        });

        expect(answer).toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('refuses a request that does not name the workspace', async () => {
        const answer = await bench.ipc.call(CHANNELS.exportOutline, {});

        expect(answer).toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });
});
