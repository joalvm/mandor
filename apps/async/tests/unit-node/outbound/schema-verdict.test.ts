import { describe, expect, it } from 'vitest';

import { eventVerdict, schemaVerdict } from '../../../src/renderer/outbound/schema-verdict.js';

describe('schemaVerdict', () => {
    it('answers nothing for a text payload, even when a schema is written', () => {
        expect(
            schemaVerdict({ payloadType: 'text', payload: 'hola', schema: '{"type": "string"}' }),
        ).toEqual([]);
    });

    it('judges the text as it travels, comments out and templates forgiven', () => {
        const issues = schemaVerdict({
            payloadType: 'json',
            payload: '{ /* nota */ "id": "uno" }',
            schema: '{"type": "object", "properties": {"id": {"type": "number"}}}',
        });

        expect(issues).toMatchObject([
            { from: 9, keyword: 'type', message: 'must be number', path: '/id', to: 14 },
        ]);
    });
});

describe('eventVerdict', () => {
    it('breaks nothing while the composer holds no event', () => {
        expect(eventVerdict(undefined, 'json')).toEqual([]);
    });

    it('judges the payload of the event against its own schema', () => {
        expect(
            eventVerdict(
                { payload: '{"id": 1}', schema: '{"properties": {"id": {"type": "string"}}}' },
                'json',
            ),
        ).toMatchObject([{ keyword: 'type', path: '/id' }]);
    });
});
