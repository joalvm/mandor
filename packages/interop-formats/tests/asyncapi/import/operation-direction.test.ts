import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Parser } from '@asyncapi/parser';
import { describe, expect, it } from 'vitest';

import { operationDirection } from '../../../src/asyncapi/import/operation-direction.js';
import type { InteropDirection } from '@mandor/interop-core';

const parser = new Parser();

async function directionsOf(fixture: string): Promise<Record<string, InteropDirection>> {
    const path = fileURLToPath(new URL(`../fixtures/${fixture}`, import.meta.url));
    const { document } = await parser.parse(readFileSync(path, 'utf8'));

    if (document === undefined) {
        throw new Error(`the fixture ${fixture} does not parse`);
    }

    return Object.fromEntries(
        document
            .operations()
            .all()
            .map((operation) => [operation.id() ?? '', operationDirection(operation)]),
    );
}

describe('operationDirection', () => {
    it('turns what the application publishes into an operation Mandor receives, in 2.x', async () => {
        const directions = await directionsOf('pasarela-2.yaml');

        expect(directions['registrarPedido']).toBe('incoming');
    });

    it('turns what the application subscribes to into an operation Mandor sends, in 2.x', async () => {
        const directions = await directionsOf('pasarela-2.yaml');

        expect(directions['recibirRecibo']).toBe('outgoing');
    });

    it('turns what the application sends into an operation Mandor receives, in 3.x', async () => {
        const directions = await directionsOf('pasarela-3.yaml');

        expect(directions['registrarPedido']).toBe('incoming');
    });

    it('turns what the application receives into an operation Mandor sends, in 3.x', async () => {
        const directions = await directionsOf('pasarela-3.yaml');

        expect(directions['recibirRecibo']).toBe('outgoing');
    });

    it('answers from the model of the parser, never from a raw key of the document', () => {
        const operation: Parameters<typeof operationDirection>[0] = { action: () => 'publish' };

        expect(operationDirection(operation)).toBe('incoming');
    });
});
