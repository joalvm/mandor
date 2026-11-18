import { describe, expect, it } from 'vitest';

import { wsActivityPushSchema } from '../../src/index.js';

describe('ws:activity push', () => {
    it('accepts a batch of records in both directions', () => {
        const push = {
            connectionId: 'gateway',
            environmentId: 'local',
            records: [
                { direction: 'out', data: 'hola', at: 1_700_000_000_000 },
                { direction: 'in', data: 'hola', at: 1_700_000_000_010 },
            ],
        };

        expect(wsActivityPushSchema.parse(push)).toEqual(push);
    });

    /** The timeline names what a frame came from, and a frame written by hand came from nothing. */
    it('carries the collection item an outbound frame came from', () => {
        const push = {
            connectionId: 'gateway',
            environmentId: 'local',
            records: [
                { direction: 'out', data: 'hola', at: 1_700_000_000_000, origin: 'Pedido creado' },
                { direction: 'in', data: 'hola', at: 1_700_000_000_010 },
            ],
        };

        expect(wsActivityPushSchema.parse(push)).toEqual(push);
    });

    /** Bytes cross the bridge as text, and the flag is what says the text is not the frame. */
    it('carries a frame that was never text as the base64 of its bytes', () => {
        const push = {
            connectionId: 'gateway',
            environmentId: null,
            records: [{ direction: 'in', data: 'AAECAw==', at: 1_700_000_000_000, binary: true }],
        };

        expect(wsActivityPushSchema.parse(push)).toEqual(push);
    });

    /**
     * The bridge parses every push, and a field the schema does not name is dropped on the way:
     * the window would never mark a frame that left without meeting its schema.
     */
    it('carries every mark a frame can wear to the window', () => {
        const push = {
            connectionId: 'gateway',
            environmentId: null,
            records: [
                {
                    direction: 'in',
                    data: '{}',
                    at: 1_700_000_000_000,
                    event: 'pedido',
                    id: '7',
                    replyTo: '6',
                    timedOut: true,
                    schemaUnmet: true,
                    elapsedMs: 40,
                },
            ],
        };

        expect(wsActivityPushSchema.parse(push)).toEqual(push);
    });

    it('rejects a record with a negative timestamp', () => {
        const result = wsActivityPushSchema.safeParse({
            connectionId: 'gateway',
            environmentId: null,
            records: [{ direction: 'in', data: 'hola', at: -1 }],
        });

        expect(result.success).toBe(false);
    });
});
