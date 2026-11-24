import { describe, expect, it } from 'vitest';

import { interopDocumentSchema } from '../../src/ir/interop-document-schema.js';

function group(path: string[], more: Record<string, unknown> = {}) {
    return {
        path,
        security: null,
        scripts: [],
        extras: {},
        ...more,
    };
}

function operation(groupPath?: string[]) {
    return {
        name: 'listar',
        channel: 'raiz',
        direction: 'outgoing',
        security: [],
        http: {
            method: 'GET',
            path: '/x',
            tags: [],
            parameters: [],
            responses: [],
            security: null,
            ...(groupPath === undefined ? {} : { group: groupPath }),
        },
        extras: {},
    };
}

const base = {
    name: 'Coleccion',
    sourceId: 'coleccion@1',
    servers: [],
    security: { bearer: { type: 'http', extras: {} } },
    channels: [{ name: 'raiz', address: '/', extras: {} }],
    operations: [],
    defaultSecurity: [],
    payloadSchemas: {},
    notes: [],
    extras: {},
};

function accepts(more: Record<string, unknown>): boolean {
    return interopDocumentSchema.safeParse({ ...base, ...more }).success;
}

describe('the groups of an intermediate document', () => {
    it('reads a document with no groups, variables, environments or scripts, as before', () => {
        expect(accepts({})).toBe(true);
    });

    it('reads the variables, environments and scripts of the document as a whole', () => {
        const variable = { name: 'host', value: 'a', enabled: true, secret: false };
        const script = { event: 'onResponse', source: 'a()', enabled: true };

        expect(
            accepts({
                variables: [variable],
                environments: [{ name: 'Prod', variables: [variable], extras: {} }],
                scripts: [script],
            }),
        ).toBe(true);
    });

    it('reads a tree of groups where a parent comes before its child', () => {
        const groups = [group(['A']), group(['A', 'B'])];

        expect(accepts({ groups, operations: [operation(['A', 'B'])] })).toBe(true);
    });

    it('refuses a group that comes before its parent, or whose parent is missing', () => {
        expect(accepts({ groups: [group(['A', 'B']), group(['A'])] })).toBe(false);
        expect(accepts({ groups: [group(['A', 'B'])] })).toBe(false);
    });

    it('refuses the same path twice', () => {
        expect(accepts({ groups: [group(['A']), group(['A'])] })).toBe(false);
    });

    it('tells a name with a slash from a path of two names', () => {
        expect(accepts({ groups: [group(['A/B']), group(['A'])] })).toBe(true);
        expect(accepts({ groups: [group(['A/B'])], operations: [operation(['A', 'B'])] })).toBe(
            false,
        );
    });

    it('refuses a request that sits in a group nobody declared', () => {
        expect(accepts({ groups: [group(['A'])], operations: [operation(['Z'])] })).toBe(false);
    });

    it('lets a request sit at the root, with no group at all', () => {
        expect(accepts({ operations: [operation()] })).toBe(true);
    });

    it('refuses a group security that names a scheme the document does not declare', () => {
        expect(accepts({ groups: [group(['A'], { security: ['bearer'] })] })).toBe(true);
        expect(accepts({ groups: [group(['A'], { security: ['ghost'] })] })).toBe(false);
    });
});
