import { degradation, importResourceSchema } from '@mandor/interop-core';
import { environmentSchema } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { workspaceResourcesOf } from '../../../src/insomnia/import/environment-resources.js';
import { documentNode } from '../support/trees.js';

function environmentIn(name: string, data: Record<string, unknown>) {
    return { name, data };
}

describe('workspaceResourcesOf: the environments', () => {
    function environmentsOf(...documents: Parameters<typeof documentNode>[0][]) {
        return workspaceResourcesOf(documents.map((each) => documentNode(each))).filter(
            (resource) => resource.place === 'environment',
        );
    }

    it('makes each sub environment an environment of the workspace', () => {
        const [prod, staging] = environmentsOf({
            environments: [
                environmentIn('Prod', { base: 'https://prod.test' }),
                environmentIn('Staging', { base: 'https://staging.test' }),
            ],
        });

        expect(prod).toMatchObject({
            place: 'environment',
            itemKind: null,
            route: 'prod',
            name: 'Prod',
            fields: {
                name: 'Prod',
                variables: [
                    { name: 'base', value: 'https://prod.test', enabled: true, secret: false },
                ],
            },
        });
        expect(staging).toMatchObject({ route: 'staging', name: 'Staging' });
        expect(importResourceSchema.safeParse(prod).success).toBe(true);
        expect(environmentSchema.safeParse({ id: 'prod', ...prod?.fields }).success).toBe(true);
    });

    it('joins the environments of one name across the collections, the first value winning', () => {
        const environments = environmentsOf(
            { sourceId: 'workspace:a', environments: [environmentIn('Prod', { a: '1' })] },
            { sourceId: 'workspace:b', environments: [environmentIn('Prod', { a: '2', b: '3' })] },
        );

        expect(environments).toHaveLength(1);
        expect(environments[0]).toMatchObject({
            origin: { sourceId: 'workspace:a' },
            fields: {
                variables: [
                    { name: 'a', value: '1' },
                    { name: 'b', value: '3' },
                ],
            },
        });
    });

    it('gives environments of alike names an id each, and one with no name the word of its kind', () => {
        const environments = environmentsOf({
            environments: [
                environmentIn('Prod', {}),
                environmentIn('prod', {}),
                environmentIn('', {}),
                environmentIn('★', {}),
            ],
        });

        expect(environments.map((each) => [each.name, each.route])).toEqual([
            ['Prod', 'prod'],
            ['prod', 'prod-2'],
            ['Environment', 'environment'],
            ['★', 'environment-2'],
        ]);
    });

    it('says what it could not hold in the variables of an environment', () => {
        const [environment] = environmentsOf({
            environments: [environmentIn('Prod', { 'bad name': 'x' })],
        });

        expect(environment?.fields['variables']).toEqual([]);
        expect(environment?.degradations).toEqual([
            degradation('variableNameUnusable', { name: 'bad name' }),
        ]);
    });

    it('has the same fingerprint while the variables are the same ones, whatever their values', () => {
        const same = (name: string, value: string) =>
            environmentsOf({ environments: [environmentIn('Prod', { [name]: value })] })[0]?.origin
                .fingerprint;

        expect(same('a', '1')).toBe(same('a', '2'));
        expect(same('a', '1')).not.toBe(same('b', '1'));
    });
});
