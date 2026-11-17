import { describe, expect, it } from 'vitest';

import { createConnection } from '../../src/connection/create-connection.js';
import { parseConnection } from '../../src/connection/parse-connection.js';

const origin = { kind: 'asyncapi', sourceId: 'pasarela@1' } as const;

describe('the origin of a connection', () => {
    it('travels inside the schema when the connection carries one', () => {
        const connection = parseConnection({
            id: 'produccion',
            name: 'Produccion',
            url: 'wss://pasarela.example/v1',
            headers: [],
            environmentId: null,
            origin,
        });

        expect(connection.origin).toEqual(origin);
    });

    it('stays absent when nobody named where the connection came from', () => {
        const connection = createConnection({ id: 'eco', name: 'Eco', url: 'wss://eco.example' });

        expect(connection.origin).toBeUndefined();
    });

    it('survives a rewrite through the parser', () => {
        const written = createConnection({
            id: 'produccion',
            name: 'Produccion',
            url: 'wss://pasarela.example/v1',
            origin,
        });
        const read = parseConnection(written);

        expect(read.origin).toEqual(origin);
    });
});
