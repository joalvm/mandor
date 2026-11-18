import type { InteropDocument, InteropMessage } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { payloadOf, schemaOf } from '../../../src/asyncapi/import/payload-of-message.js';

function document(): InteropDocument {
    return {
        name: 'Pasarela',
        sourceId: '',
        servers: [],
        security: {},
        channels: [],
        operations: [],
        defaultSecurity: [],
        payloadSchemas: {
            orden: {
                text: '{"type":"object","properties":{"id":{"type":"integer"}}}',
                extras: {},
            },
        },
        notes: [],
        extras: {},
    };
}

function message(overrides: Partial<InteropMessage> = {}): InteropMessage {
    return { examples: [], extras: {}, ...overrides };
}

describe('the body a message opens with', () => {
    it('takes the example the document shipped, as it shipped it', () => {
        expect(payloadOf(message({ examples: ['{"id": 1}'] }), document())).toBe('{"id": 1}');
    });

    it('generates one from the schema when the document shipped none', () => {
        const body = JSON.parse(payloadOf(message({ payloadSchema: 'orden' }), document())) as {
            id: number;
        };

        expect(Number.isFinite(body.id)).toBe(true);
    });

    it('opens blank when the message promises neither example nor schema', () => {
        expect(payloadOf(message(), document())).toBe('');
        expect(payloadOf(undefined, document())).toBe('');
    });

    it('answers the schema text the document wrote under the name the message promises', () => {
        expect(schemaOf(message({ payloadSchema: 'orden' }), document())).toBe(
            '{"type":"object","properties":{"id":{"type":"integer"}}}',
        );
        expect(schemaOf(message(), document())).toBeUndefined();
        expect(schemaOf(undefined, document())).toBeUndefined();
    });
});
