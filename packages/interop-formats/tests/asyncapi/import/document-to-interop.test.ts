import { describe, expect, it } from 'vitest';

import { documentToInterop } from '../../../src/asyncapi/import/document-to-interop.js';
import { documentSourceId } from '../../../src/asyncapi/document/document-source-id.js';
import { interopDocumentSchema } from '@mandor/interop-core';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function textOf(fixture: string): string {
    return readFileSync(fileURLToPath(new URL(`../fixtures/${fixture}`, import.meta.url)), 'utf8');
}

const IMPORTED = new Map<string, ReturnType<typeof documentToInterop>>();

/** What a fixture imports as, parsed once for the file: parsing a document is most of a test. */
function irOf(fixture: string): ReturnType<typeof documentToInterop> {
    const known = IMPORTED.get(fixture);

    if (known !== undefined) {
        return known;
    }

    const imported = documentToInterop(textOf(fixture));

    IMPORTED.set(fixture, imported);

    return imported;
}

describe('documentToInterop', () => {
    it('names the document after the service and keeps the identity stable per text', async () => {
        for (const fixture of ['pasarela-2.yaml', 'pasarela-3.yaml']) {
            const text = textOf(fixture);
            const ir = await documentToInterop(text);

            expect(ir.name).toBe('Pasarela');
            expect(ir.sourceId).toBe(documentSourceId(text));
            expect(ir.sourceId).toBe(await documentToInterop(text).then((again) => again.sourceId));
        }
    });

    it('produces IR that meets the shared schema, in both format versions', async () => {
        for (const fixture of ['pasarela-2.yaml', 'pasarela-3.yaml']) {
            const ir = await irOf(fixture);

            expect(interopDocumentSchema.safeParse(ir).success).toBe(true);
        }
    });

    it('builds one connection out of the one server the document offers, with its security', async () => {
        for (const fixture of ['pasarela-2.yaml', 'pasarela-3.yaml']) {
            const ir = await irOf(fixture);

            expect(ir.servers).toHaveLength(1);
            expect(ir.servers[0]).toMatchObject({
                name: 'produccion',
                url: 'wss://pasarela.ejemplo.com:443/v1',
                protocol: 'wss',
                security: ['token-portador'],
            });
            expect(ir.security['token-portador']).toMatchObject({ type: 'http' });
        }
    });

    it('keeps the wire address of every channel, and what the channel says it is for', async () => {
        for (const fixture of ['pasarela-2.yaml', 'pasarela-3.yaml']) {
            const ir = await irOf(fixture);
            const addresses = ir.channels.map((channel) => channel.address).sort();

            expect(addresses).toEqual([
                'avisos/salientes',
                'pedidos/entrantes',
                'recibos/salientes',
            ]);
            expect(
                ir.channels.find((channel) => channel.address === 'pedidos/entrantes')?.description,
            ).toBe('Pedidos que entran a la pasarela');
        }
    });

    it('turns every operation with the arrow already flipped towards Mandor', async () => {
        for (const fixture of ['pasarela-2.yaml', 'pasarela-3.yaml']) {
            const ir = await irOf(fixture);
            const directionOf = Object.fromEntries(
                ir.operations.map((op) => [op.name, op.direction]),
            );

            expect(directionOf['registrarPedido']).toBe('incoming');
            expect(directionOf['recibirRecibo']).toBe('outgoing');
            expect(directionOf['notificarRecibo']).toBe('outgoing');
        }
    });

    it('embeds the shared payload schema in both messages that use it', async () => {
        for (const fixture of ['pasarela-2.yaml', 'pasarela-3.yaml']) {
            const ir = await irOf(fixture);
            const texts = ir.operations
                .filter((op) => op.name === 'recibirRecibo' || op.name === 'notificarRecibo')
                .map((op) => ir.payloadSchemas[op.message?.payloadSchema ?? '']?.text);

            expect(texts).toHaveLength(2);

            for (const text of texts) {
                expect(text).toContain('"total"');
                expect(text).not.toContain('$ref');
            }
        }
    });

    it('registers one schema under the name the document gave it, when both versions agree', async () => {
        const ir = await irOf('pasarela-2.yaml');

        expect(Object.keys(ir.payloadSchemas)).toContain('reciboEmitido');
        expect(
            ir.operations.find((op) => op.name === 'recibirRecibo')?.message?.payloadSchema,
        ).toBe('reciboEmitido');
    });

    it('keeps the examples the document shipped, as written', async () => {
        for (const fixture of ['pasarela-2.yaml', 'pasarela-3.yaml']) {
            const ir = await irOf(fixture);
            const message = ir.operations.find((op) => op.name === 'recibirRecibo')?.message;

            expect(message?.examples).toHaveLength(1);
            expect(message?.examples[0]).toContain('42.5');
            expect(message?.payloadType).toBe('json');
        }
    });

    it('keeps the keys it does not know instead of dropping them', async () => {
        for (const fixture of ['pasarela-2.yaml', 'pasarela-3.yaml']) {
            const ir = await irOf(fixture);

            expect(ir.extras['x-zona']).toBe('eu-oeste');
        }
    });
});
