import { describe, expect, it } from 'vitest';

import { withGraphqlQuery } from '../../../../src/renderer/features/requests/lib/graphql-body-query.js';

const BODY = {
    operationName: 'Orders',
    query: 'query Orders { orders { id } }',
    type: 'graphql' as const,
    variables: '{}',
};

describe('the body a GraphQL query leaves behind', () => {
    it('keeps the operation while the document still holds it', () => {
        const query = 'query Orders { orders { id total } }';

        expect(withGraphqlQuery(BODY, query)).toEqual({ ...BODY, query });
    });

    it('drops the operation the document no longer names', () => {
        expect(withGraphqlQuery(BODY, 'query Users { users { id } }')).toEqual({
            query: 'query Users { users { id } }',
            type: 'graphql',
            variables: '{}',
        });
    });

    it('keeps the operation while the query is half typed and does not parse', () => {
        expect(withGraphqlQuery(BODY, 'query Users {')).toEqual({
            ...BODY,
            query: 'query Users {',
        });
    });
});
