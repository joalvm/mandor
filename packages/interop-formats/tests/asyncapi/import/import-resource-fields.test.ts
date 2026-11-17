import { describe, expect, it } from 'vitest';

import { importResourcesOf } from '../../../src/asyncapi/import/import-resources.js';
import { documentToInterop } from '../../../src/asyncapi/import/document-to-interop.js';
import type { InteropDocument, InteropOperation } from '@mandor/interop-core';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function textOf(fixture: string): string {
    return readFileSync(fileURLToPath(new URL(`../fixtures/${fixture}`, import.meta.url)), 'utf8');
}

function documentOf(overrides: Partial<InteropDocument>): InteropDocument {
    return {
        name: 'Pasarela',
        sourceId: 'abc',
        servers: [],
        security: {},
        channels: [{ name: 'recibosSalientes', address: 'recibos/salientes', extras: {} }],
        operations: [],
        defaultSecurity: [],
        payloadSchemas: {},
        notes: [],
        extras: {},
        ...overrides,
    };
}

function operationOf(overrides: Partial<InteropOperation>): InteropOperation {
    return {
        name: 'recibirRecibo',
        channel: 'recibosSalientes',
        direction: 'outgoing',
        security: [],
        extras: {},
        ...overrides,
    };
}

async function fieldsOfFixture(fixture: string): Promise<Record<string, unknown>[]> {
    const ir = await documentToInterop(textOf(fixture));
    const items = importResourcesOf(ir).filter((resource) => resource.place === 'item');

    return items.map((item) => item.fields);
}

function fieldsOfDocument(document: InteropDocument): Record<string, unknown> | undefined {
    const item = importResourcesOf(document).find((resource) => resource.place === 'item');

    return item?.fields;
}

describe('the fields an imported item carries', () => {
    it('keeps what the document said that no known field claims, as loose keys', () => {
        const fields = fieldsOfDocument(
            documentOf({
                operations: [
                    operationOf({
                        message: { examples: [], extras: { 'x-interno': { cola: 'primaria' } } },
                    }),
                ],
            }),
        );

        expect(fields?.['x-interno']).toEqual({ cola: 'primaria' });
    });

    it('writes the direction the operation flows, so the workspace can answer with it', async () => {
        const fields = await fieldsOfFixture('pasarela-3.yaml');

        expect(fields[0]?.['direction']).toBe('outgoing');
        expect(fields[1]?.['direction']).toBe('outgoing');
    });

    it('keeps the name of the message apart from the id of the operation when they differ', async () => {
        const fields = await fieldsOfFixture('pasarela-3.yaml');

        expect(fields[0]?.['messageName']).toBe('recibo');
        expect(fields[1]?.['messageName']).toBe('recibo');
    });

    it('writes the security the operation asks for, by name', () => {
        const fields = fieldsOfDocument(
            documentOf({
                operations: [operationOf({ security: ['token-portador'] })],
            }),
        );

        expect(fields?.['security']).toEqual(['token-portador']);
    });

    it('keeps the sample the document shipped as the body the item opens with', async () => {
        const fields = await fieldsOfFixture('pasarela-3.yaml');

        expect(fields[0]?.['payload']).toBe('{"id":"1234","total":42.5}');
    });

    it('leaves the reference out: the content arrived resolved, and where is not content', async () => {
        const fields = await fieldsOfFixture('pasarela-3.yaml');

        expect(fields.every((field) => !('$ref' in field))).toBe(true);
    });
});
