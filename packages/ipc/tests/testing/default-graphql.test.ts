import { createRequestItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { graphqlIntrospectResultSchema, graphqlSchemaReadResultSchema } from '../../src/index.js';
import { defaultGraphql } from '../../src/testing/default-graphql.js';
import { createFakeBridge } from '../../src/testing/fake-bridge.js';

const INPUT = {
    workspaceId: 'demo',
    itemPath: 'ping',
    environmentId: null,
    request: createRequestItem({ name: 'ping' }),
};

describe('the graphql area a test gets when it says nothing about it', () => {
    it('has no schema kept, in the shape its own channel accepts', async () => {
        const answer = await defaultGraphql().readSchema(INPUT);

        expect(graphqlSchemaReadResultSchema.parse(answer)).toEqual({ ok: true, value: null });
    });

    it('answers an introspection its own channel accepts', async () => {
        const answer = await defaultGraphql().introspect(INPUT);

        expect(graphqlIntrospectResultSchema.safeParse(answer).success).toBe(true);
    });

    it('is the graphql of the fake bridge, until a test replaces a method', async () => {
        const bridge = createFakeBridge({
            graphql: { introspect: () => Promise.resolve({ ok: true, value: defaultValue() }) },
        });

        await expect(bridge.graphql.readSchema(INPUT)).resolves.toEqual({ ok: true, value: null });
    });
});

function defaultValue() {
    return { fetchedAt: '1970-01-01T00:00:00.000Z', introspection: { __schema: {} } };
}
