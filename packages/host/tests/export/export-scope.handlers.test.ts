import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CHANNELS } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { everyNode, openBench, outlineOf, writeOf, type ExportBench } from './export-bench.js';

let bench: ExportBench;

const TIENDA = { scope: 'collection', collection: 'pedidosentrantes' } as const;

beforeEach(async () => {
    bench = await openBench();
});

afterEach(async () => {
    await bench.stop();
});

describe('the outline of one collection', () => {
    it('offers the collection and what it holds, and nothing the workspace keeps above it', async () => {
        const { nodes } = (await outlineOf(bench, TIENDA)).value;
        const kinds = everyNode(nodes).map((node) => node.kind);

        expect(nodes.map((node) => node.kind)).toEqual(['collection']);
        expect(kinds).not.toContain('connection');
        expect(kinds).not.toContain('environment');
        expect(everyNode(nodes).map((node) => node.label)).toEqual(
            expect.arrayContaining(['registrarPedido', 'consultarPedido']),
        );
    });

    it('offers nothing when the route names no collection of the workspace', async () => {
        const answer = await outlineOf(bench, { scope: 'collection', collection: 'no-existe' });

        expect(answer.ok).toBe(true);
        expect(answer.value.nodes).toEqual([]);
    });

    it('refuses a collection scope that names none, before it reads the disk', async () => {
        const answer = await bench.ipc.call(CHANNELS.exportOutline, {
            workspaceId: 'pasarela',
            format: 'fixture',
            scope: 'collection',
        });

        expect(answer).toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });
});

describe('writing one collection', () => {
    it('writes the collection and leaves out a connection the request names', async () => {
        const answer = await writeOf(
            bench,
            ['connection/produccion', 'collection/0/item/0'],
            TIENDA,
        );

        expect(answer).toEqual({ ok: true, value: { path: join(bench.dir, 'out.json') } });

        const written = await readFile(join(bench.dir, 'out.json'), 'utf8');

        expect(written).toContain('registrarPedido');
        expect(written).not.toContain('pasarela.ejemplo.com');
    });
});
