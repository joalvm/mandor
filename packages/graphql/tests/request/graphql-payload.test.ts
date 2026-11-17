import { describe, expect, it } from 'vitest';

import { GraphqlPayloadError } from '../../src/request/graphql-payload-error.js';
import { graphqlPayload } from '../../src/request/graphql-payload.js';

const QUERY = 'query A { a } query B { b }';

function reasonOf(run: () => unknown): string | undefined {
    try {
        run();
    } catch (error) {
        return error instanceof GraphqlPayloadError ? error.reason : 'other';
    }

    return undefined;
}

describe('graphqlPayload', () => {
    it('writes the query alone when there are no variables nor operation name', () => {
        const text = graphqlPayload({ query: '{ a }', variables: '  ', operationName: undefined });

        expect(JSON.parse(text)).toEqual({ query: '{ a }' });
    });

    it('carries the variables as an object and the chosen operation', () => {
        const text = graphqlPayload({ query: QUERY, variables: '{"id": "1"}', operationName: 'B' });

        expect(JSON.parse(text)).toEqual({
            query: QUERY,
            variables: { id: '1' },
            operationName: 'B',
        });
    });

    it('reads variables with comments and trailing commas, as the editor lets them be written', () => {
        const text = graphqlPayload({
            query: '{ a }',
            variables: '{ // who\n "id": 1, }',
            operationName: '',
        });

        expect(JSON.parse(text)).toEqual({ query: '{ a }', variables: { id: 1 } });
    });

    it.each(['{', '[1]', '3', 'null'])('refuses the variables %s', (variables) => {
        expect(reasonOf(() => graphqlPayload({ query: '{ a }', variables }))).toBe('variables');
    });

    it('refuses a query that does not parse', () => {
        expect(reasonOf(() => graphqlPayload({ query: 'query {', variables: '' }))).toBe('syntax');
    });

    it('refuses to send a subscription: the only one, or the one chosen', () => {
        const only = reasonOf(() => graphqlPayload({ query: 'subscription { t }', variables: '' }));
        const chosen = reasonOf(() =>
            graphqlPayload({
                query: 'query A { a } subscription S { t }',
                variables: '',
                operationName: 'S',
            }),
        );

        expect(only).toBe('subscription');
        expect(chosen).toBe('subscription');
    });

    it('sends a document that mixes operations when the chosen one is a query', () => {
        const text = graphqlPayload({
            query: 'query A { a } subscription S { t }',
            variables: '',
            operationName: 'A',
        });

        expect(JSON.parse(text)).toMatchObject({ operationName: 'A' });
    });

    it('sends a document with several operations and none chosen, and leaves the choice to the server', () => {
        const text = graphqlPayload({ query: QUERY, variables: '' });

        expect(JSON.parse(text)).toEqual({ query: QUERY });
    });
});
