import {
    degradation,
    type ImportResource,
    type InteropDocument,
    type InteropOperation,
} from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { importResourcesOf } from '../../../src/openapi/import/import-resources.js';

function operation(name: string, tags: string[], security: string[] | null = null) {
    return {
        name,
        channel: '/x',
        direction: 'outgoing',
        security: [],
        http: { method: 'GET', path: '/x', tags, parameters: [], responses: [], security },
        extras: {},
    } satisfies InteropOperation;
}

function documentWith(operations: InteropOperation[]): InteropDocument {
    return {
        name: 'Doc',
        sourceId: 'abc',
        servers: [],
        security: {},
        channels: [],
        operations,
        defaultSecurity: [],
        payloadSchemas: {},
        notes: [],
        extras: {},
    };
}

describe('the auth a request of the import wears', () => {
    it('leaves out an operation that is no request, and the workspace when no auth is held', () => {
        const message = { ...operation('Event', []), http: undefined };
        const resources: ImportResource[] = importResourcesOf(
            documentWith([message, operation('A', [], ['gone'])]),
            'workspace',
        );

        expect(resources.map((resource) => resource.place)).toEqual([
            'environment',
            'collection',
            'item',
        ]);
        expect(resources[2]?.degradations).toEqual([
            degradation('securityNotDeclared', { name: 'gone' }),
        ]);
    });

    it('keeps the scheme of a request of a collection on the request, which has no workspace to lend it', () => {
        const document: InteropDocument = {
            ...documentWith([operation('A', [], ['bearer'])]),
            security: { bearer: { type: 'http', extras: { scheme: 'bearer' } } },
            defaultSecurity: ['bearer'],
        };
        const inWorkspace = importResourcesOf(document, 'workspace').find(
            (resource) => resource.place === 'item',
        );
        const inCollection = importResourcesOf(document, 'collection').find(
            (resource) => resource.place === 'item',
        );

        expect(inWorkspace?.fields['auth']).toBeUndefined();
        expect(inCollection?.fields['auth']).toEqual({ type: 'bearer', token: '{{token}}' });
    });

    it('gives a request of a collection the security the document asks of everything when it names none', () => {
        const document: InteropDocument = {
            ...documentWith([operation('A', [])]),
            security: { bearer: { type: 'http', extras: { scheme: 'bearer' } } },
            defaultSecurity: ['bearer'],
        };
        const find = (scope: 'collection' | 'workspace') =>
            importResourcesOf(document, scope).find((resource) => resource.place === 'item');

        expect(find('collection')?.fields['auth']).toEqual({ type: 'bearer', token: '{{token}}' });
        expect(find('workspace')?.fields['auth']).toBeUndefined();
    });

    it('lets a request with an empty security list be no-auth even when the workspace holds none', () => {
        const resources = importResourcesOf(documentWith([operation('A', [], [])]), 'workspace');

        expect(resources[2]?.fields['auth']).toEqual({ type: 'none' });
    });

    it('says why the request keeps no auth when the scheme is one Mandor cannot hold', () => {
        const document: InteropDocument = {
            ...documentWith([operation('A', [], ['digest'])]),
            security: {
                basic: { type: 'http', extras: { scheme: 'basic' } },
                digest: { type: 'http', extras: { scheme: 'digest' } },
            },
        };
        const request = importResourcesOf(document, 'workspace').find(
            (resource) => resource.place === 'item',
        );

        expect(request?.fields['auth']).toBeUndefined();
        expect(request?.degradations).toEqual([
            degradation('securityHttpUnsupported', { name: 'digest', scheme: 'digest' }),
        ]);
    });
});
