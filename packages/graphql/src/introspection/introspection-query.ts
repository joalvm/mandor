import { getIntrospectionQuery } from 'graphql';

/** The query every GraphQL server answers with its schema; the default options ask for all of it. */
export const INTROSPECTION_QUERY = getIntrospectionQuery();
