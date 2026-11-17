import { importResourceSchema } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import type { BrunoVariable } from '../../../src/bruno/document/bruno-tree.js';
import { workspaceResourcesOf } from '../../../src/bruno/import/workspace-resources.js';
import { documentNode } from '../support/trees.js';

function variableOf(name: string, value = '', extra: Partial<BrunoVariable> = {}): BrunoVariable {
    return { name, value, disabled: false, secret: false, ...extra };
}

describe('workspaceResourcesOf: the environments', () => {
    it('lists the environments and no workspace, whatever auth the collection asks', () => {
        const resources = workspaceResourcesOf([
            documentNode({
                auth: { type: 'basic', username: 'ana', password: '{{password}}' },
                environments: [{ name: 'Local', variables: [variableOf('base', 'http://x')] }],
            }),
        ]);

        expect(resources.map((each) => `${each.place}:${each.route}`)).toEqual([
            'environment:local',
        ]);
        expect(resources.every((each) => importResourceSchema.safeParse(each).success)).toBe(true);
    });

    it('writes an environment as its name and its variables, with the origin of its collection', () => {
        const [environment] = workspaceResourcesOf([
            documentNode({
                environments: [
                    {
                        name: 'Prod',
                        variables: [
                            variableOf('base', 'https://api.test'),
                            variableOf('token', 'abc', { secret: true }),
                            variableOf('debug', '1', { disabled: true }),
                        ],
                    },
                ],
            }),
        ]);

        expect(environment).toMatchObject({
            place: 'environment',
            itemKind: null,
            route: 'prod',
            name: 'Prod',
            origin: { kind: 'bruno', sourceId: 'collection:abc' },
            fields: {
                name: 'Prod',
                variables: [
                    { name: 'base', value: 'https://api.test', enabled: true, secret: false },
                    { name: 'token', value: 'abc', enabled: true, secret: true },
                    { name: 'debug', value: '1', enabled: false, secret: false },
                ],
            },
            degradations: [],
        });
    });

    it('joins the environments of one name across collections, the first value of a variable winning', () => {
        const resources = workspaceResourcesOf([
            documentNode({
                sourceId: 'collection:a',
                environments: [{ name: 'Prod', variables: [variableOf('x', 'first')] }],
            }),
            documentNode({
                sourceId: 'collection:b',
                environments: [
                    { name: 'Prod', variables: [variableOf('x', 'second'), variableOf('y', '2')] },
                ],
            }),
        ]);

        expect(resources).toHaveLength(1);
        expect(resources[0]).toMatchObject({
            origin: { sourceId: 'collection:a' },
            fields: {
                variables: [
                    { name: 'x', value: 'first' },
                    { name: 'y', value: '2' },
                ],
            },
        });
    });

    it('gives environments whose names slug alike an id each, and a nameless one its word', () => {
        const resources = workspaceResourcesOf([
            documentNode({
                environments: [
                    { name: 'Prod', variables: [] },
                    { name: 'prod', variables: [] },
                    { name: ' ', variables: [] },
                ],
            }),
        ]);

        expect(resources.map((each) => [each.name, each.route])).toEqual([
            ['Prod', 'prod'],
            ['prod', 'prod-2'],
            ['Environment', 'environment'],
        ]);
    });
});
