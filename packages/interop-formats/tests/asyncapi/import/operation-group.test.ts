import { describe, expect, it } from 'vitest';

import { operationGroupOf, tagsBesideGroup } from '../../../src/asyncapi/import/operation-group.js';
import type { InteropDocument } from '@mandor/interop-core';

function documentOf(name = 'Pasarela'): InteropDocument {
    return {
        name,
        sourceId: 'abc',
        servers: [],
        security: {},
        channels: [],
        operations: [],
        defaultSecurity: [],
        payloadSchemas: {},
        notes: [],
        extras: {},
    };
}

function operationOf(extras: Record<string, unknown>, messageExtras?: Record<string, unknown>) {
    return {
        name: 'recibirRecibo',
        channel: 'recibosSalientes',
        direction: 'outgoing' as const,
        security: [],
        extras,
        ...(messageExtras === undefined
            ? {}
            : { message: { name: 'recibo', examples: [], extras: messageExtras } }),
    };
}

describe('operationGroupOf', () => {
    it('answers the domain the document declares, above any other tag', () => {
        const group = operationGroupOf(
            operationOf({ tags: [{ name: 'usuarios' }, { name: 'module:pagos' }] }),
            documentOf(),
        );

        expect(group).toBe('pagos');
    });

    it('reads a tag written as a bare string, as the object form says the same', () => {
        expect(operationGroupOf(operationOf({ tags: ['recibos'] }), documentOf())).toBe('recibos');
    });

    it('answers the first plain tag when the document declares no domain', () => {
        const group = operationGroupOf(
            operationOf({ tags: [{ name: 'source:handleRecibo' }, { name: 'recibos' }] }),
            documentOf(),
        );

        expect(group).toBe('recibos');
    });

    it('reads the tags of the message when the operation carries none', () => {
        const group = operationGroupOf(operationOf({}), documentOf());

        expect(group).not.toBe('recibos');

        const tagged = operationGroupOf(
            operationOf({}, { tags: [{ name: 'recibos' }] }),
            documentOf(),
        );

        expect(tagged).toBe('recibos');
    });

    it('answers with the document name when nothing tags the operation', () => {
        const group = operationGroupOf(operationOf({}), documentOf('Almacen'));

        expect(group).toBe('Almacen');
    });
});

describe('tagsBesideGroup', () => {
    it('leaves the plain tags that did not open the folder, once each', () => {
        const operation = operationOf(
            { tags: [{ name: 'pagos' }, { name: 'module:pagos' }, 'beta'] },
            { tags: [{ name: 'beta' }, { name: ' ' }] },
        );

        expect(tagsBesideGroup(operation, 'pagos')).toEqual(['beta']);
    });
});
