import { describe, expect, it } from 'vitest';

import { exportOutlineRequestSchema, exportOutlineResultSchema } from '../../src/index.js';

describe('the contract of the outline of an export', () => {
    it('takes the workspace the outline comes from, its format and its scope, and nothing else', () => {
        const request = { workspaceId: 'pasarela', format: 'asyncapi', scope: 'workspace' };

        expect(exportOutlineRequestSchema.parse(request)).toEqual(request);
        expect(exportOutlineRequestSchema.safeParse({ workspaceId: 'pasarela' }).success).toBe(
            false,
        );
        expect(exportOutlineRequestSchema.safeParse({ ...request, root: '/tmp' }).success).toBe(
            false,
        );
    });

    it('asks for one collection by its route when the scope is a collection', () => {
        const request = {
            workspaceId: 'pasarela',
            format: 'openapi',
            scope: 'collection',
            collection: 'tienda',
        };

        expect(exportOutlineRequestSchema.parse(request)).toEqual(request);
    });

    it('refuses a collection scope with no collection, and a collection with the workspace scope', () => {
        const base = { workspaceId: 'pasarela', format: 'openapi' };

        expect(exportOutlineRequestSchema.safeParse({ ...base, scope: 'collection' }).success).toBe(
            false,
        );
        expect(
            exportOutlineRequestSchema.safeParse({
                ...base,
                scope: 'workspace',
                collection: 'tienda',
            }).success,
        ).toBe(false);
        expect(exportOutlineRequestSchema.safeParse({ ...base, scope: 'repo' }).success).toBe(
            false,
        );
    });

    it('answers the name of the workspace and the nodes, the barred ones with their reason', () => {
        const answer = {
            ok: true,
            value: {
                name: 'Pasarela',
                nodes: [
                    {
                        id: 'collection/0',
                        kind: 'collection',
                        label: 'Tienda',
                        children: [
                            {
                                id: 'collection/0/item/0',
                                kind: 'request',
                                label: 'registrar',
                                children: [],
                                reason: 'messagesNotHttp',
                            },
                        ],
                    },
                ],
            },
        };

        expect(exportOutlineResultSchema.parse(answer)).toEqual(answer);
    });

    it('refuses a node of a kind the outline does not know, at any depth', () => {
        const node = (kind: string) => ({ id: 'a', kind, label: 'a', children: [] });
        const answer = (inner: string) => ({
            ok: true,
            value: {
                name: 'Pasarela',
                nodes: [{ ...node('collection'), children: [node(inner)] }],
            },
        });

        expect(exportOutlineResultSchema.safeParse(answer('folder')).success).toBe(true);
        expect(exportOutlineResultSchema.safeParse(answer('table')).success).toBe(false);
    });
});
