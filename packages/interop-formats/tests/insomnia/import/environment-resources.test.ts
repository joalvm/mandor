import { degradation } from '@mandor/interop-core';
import { plainVariableSchema } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import {
    baseVariablesOf,
    workspaceResourcesOf,
} from '../../../src/insomnia/import/environment-resources.js';
import { collectionResourcesOf } from '../../../src/insomnia/import/collection-resources.js';
import { documentNode } from '../support/trees.js';

function environmentIn(name: string, data: Record<string, unknown>) {
    return { name, data };
}

describe('the base environment of a document: the variables of its collection', () => {
    it('writes nothing for the workspace: a base environment is no level above the collection', () => {
        expect(workspaceResourcesOf([documentNode()])).toEqual([]);
        expect(
            workspaceResourcesOf([documentNode({ base: environmentIn('Base', { a: '1' }) })]),
        ).toEqual([]);
    });

    it('holds no variable when the document has no base, or an empty one', () => {
        expect(baseVariablesOf(documentNode())).toEqual({ variables: [], degradations: [] });
        expect(
            baseVariablesOf(documentNode({ base: environmentIn('Base', {}) })).variables,
        ).toEqual([]);
    });

    it('enters as the variables of the collection, which the chosen environment overrides', () => {
        const [collection] = collectionResourcesOf(
            documentNode({
                name: 'Tienda',
                base: environmentIn('Base', {
                    base: 'https://api.test',
                    retries: 3,
                    verbose: false,
                }),
            }),
        );

        expect(collection).toMatchObject({
            place: 'collection',
            name: 'Tienda',
            fields: {
                variables: [
                    { name: 'base', value: 'https://api.test', enabled: true, secret: false },
                    { name: 'retries', value: '3', enabled: true, secret: false },
                    { name: 'verbose', value: 'false', enabled: true, secret: false },
                ],
            },
        });
    });

    it('keeps each collection with its own base when two documents have one each', () => {
        const [first] = collectionResourcesOf(
            documentNode({ name: 'A', base: environmentIn('Base', { a: 'first' }) }),
        );
        const [second] = collectionResourcesOf(
            documentNode({
                name: 'B',
                sourceId: 'workspace:b',
                base: environmentIn('Base', { a: 'second' }),
            }),
        );

        expect(first?.fields['variables']).toMatchObject([{ name: 'a', value: 'first' }]);
        expect(second?.fields['variables']).toMatchObject([{ name: 'a', value: 'second' }]);
        expect(first?.origin.fingerprint).not.toBe(second?.origin.fingerprint);
    });

    it('writes the references the way Mandor does and says on the collection what it could not hold', () => {
        const document = documentNode({
            base: environmentIn('Base', {
                owner: '{{ _.base }}/owner',
                id: '{% uuid %}',
                'bad name': 'x',
                limits: { page: 20 },
                list: [1],
                nothing: null,
            }),
        });
        const mapped = baseVariablesOf(document);
        const [collection] = collectionResourcesOf(document);

        expect(mapped.variables).toMatchObject([
            { name: 'owner', value: '{{base}}/owner' },
            { name: 'id', value: '{% uuid %}' },
            { name: 'nothing', value: '' },
        ]);
        expect(collection?.degradations).toEqual([
            degradation('variableNameUnusable', { name: 'bad name' }),
            degradation('variableIsObject', { name: 'limits' }),
            degradation('variableIsObject', { name: 'list' }),
            degradation('templateUnsupported', { template: '{% uuid %}' }),
        ]);
        expect(
            mapped.variables.every((variable) => plainVariableSchema.safeParse(variable).success),
        ).toBe(true);
    });
});
