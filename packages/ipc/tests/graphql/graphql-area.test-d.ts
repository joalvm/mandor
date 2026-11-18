import { describe, expectTypeOf, it } from 'vitest';

import type { GraphqlArea } from '../../src/index.js';
import type { GraphqlIntrospectRequest } from '../../src/graphql/graphql-introspect.js';
import type { GraphqlSchemaReadRequest } from '../../src/graphql/graphql-schema-read.js';

describe('the graphql area of the bridge contract', () => {
    it('reads by the request its channel validates', () => {
        expectTypeOf<GraphqlArea['readSchema']>()
            .parameter(0)
            .toEqualTypeOf<GraphqlSchemaReadRequest>();
    });

    it('asks the server by the request its channel validates', () => {
        expectTypeOf<GraphqlArea['introspect']>()
            .parameter(0)
            .toEqualTypeOf<GraphqlIntrospectRequest>();
    });
});
