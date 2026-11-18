import { degradation } from '../../src/resource/degradation.js';
import type { ItemOrigin } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { environmentResources } from '../../src/import/environment-resources.js';

type Environment = { name: string; variables: string[] };

const JOINED = degradation('pkceAlways');

const reader = {
    variablesOf: (group: readonly Environment[]) => ({
        variables: group.flatMap(({ variables }) =>
            variables.map((name) => ({ name, value: '', enabled: true, secret: false })),
        ),
        degradations: group.length > 1 ? [JOINED] : [],
    }),
    originOf: (sourceId: string, fingerprint: string): ItemOrigin => ({
        kind: 'bruno',
        sourceId,
        fingerprint,
    }),
};

describe('environmentResources', () => {
    it('makes one environment of the ones that share a name, from the first source to bring it', () => {
        const [dev, prod] = environmentResources(
            [
                { sourceId: 'a', environments: [{ name: 'dev', variables: ['x'] }] },
                {
                    sourceId: 'b',
                    environments: [
                        { name: 'dev', variables: ['y'] },
                        { name: 'prod', variables: [] },
                    ],
                },
            ],
            reader,
        );

        expect(dev).toMatchObject({
            place: 'environment',
            route: 'dev',
            name: 'dev',
            origin: { sourceId: 'a' },
            degradations: [JOINED],
        });
        expect(dev?.fields['variables']).toHaveLength(2);
        expect(prod).toMatchObject({ route: 'prod', origin: { sourceId: 'b' }, degradations: [] });
    });

    it('calls an environment with no name by the word of what it is', () => {
        const [resource] = environmentResources(
            [{ sourceId: 'a', environments: [{ name: '', variables: [] }] }],
            reader,
        );

        expect(resource).toMatchObject({ name: 'Environment', route: 'environment' });
    });

    it('is empty when no source brings an environment', () => {
        expect(environmentResources([{ sourceId: 'a', environments: [] }], reader)).toEqual([]);
    });
});
