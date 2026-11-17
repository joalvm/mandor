import { degradation, type InteropDocument } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import {
    workspaceAuthNotesOf,
    workspaceAuthOf,
    workspaceResourceOf,
} from '../../../src/openapi/import/workspace-auth.js';

function documentWith(
    security: InteropDocument['security'],
    defaultSecurity: string[] = [],
): InteropDocument {
    return {
        name: 'Pets',
        sourceId: 'abc',
        servers: [],
        security,
        channels: [],
        operations: [],
        defaultSecurity,
        payloadSchemas: {},
        notes: [],
        extras: {},
    };
}

const BASIC = { type: 'http', extras: { scheme: 'basic' } };
const BEARER = { type: 'http', extras: { scheme: 'bearer' } };
const DIGEST = { type: 'http', extras: { scheme: 'digest' } };

describe('the auth of the workspace an OpenAPI document asks for', () => {
    it('takes the first scheme of the global security, else the first one declared', () => {
        const security = { a: BASIC, b: BEARER };

        expect(workspaceAuthOf(documentWith(security, ['b']))?.name).toBe('b');
        expect(workspaceAuthOf(documentWith(security, ['missing', 'b']))?.name).toBe('b');
        expect(workspaceAuthOf(documentWith(security))?.name).toBe('a');
        expect(workspaceAuthOf(documentWith({}))).toBeUndefined();
    });

    it('writes it as the auth of the workspace file, owned by this document', () => {
        const resource = workspaceResourceOf(documentWith({ a: BEARER }));

        expect(resource).toMatchObject({
            place: 'workspace',
            itemKind: null,
            route: '.',
            name: 'Pets',
            fields: { auth: { type: 'bearer', token: '{{token}}' } },
            origin: { kind: 'openapi', sourceId: 'abc' },
            degradations: [],
        });
        expect(resource?.origin.fingerprint).toMatch(/^[0-9a-f]{16}$/u);
    });

    it('writes nothing for a document with no security, or one that Mandor cannot hold', () => {
        expect(workspaceResourceOf(documentWith({}))).toBeUndefined();
        expect(workspaceResourceOf(documentWith({ d: DIGEST }))).toBeUndefined();
    });

    it('says in the notes why a scheme did not enter, and nothing when nothing is wrong', () => {
        expect(workspaceAuthNotesOf(documentWith({ d: DIGEST }))).toEqual([
            degradation('securityHttpUnsupported', { name: 'd', scheme: 'digest' }),
        ]);
        expect(workspaceAuthNotesOf(documentWith({ a: BASIC }))).toEqual([]);
        expect(workspaceAuthNotesOf(documentWith({}))).toEqual([]);
    });
});
