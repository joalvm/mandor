import type { GraphqlArea } from '../graphql/graphql-area.js';
import { success } from '../result/success.js';

/**
 * The graphql area a test gets when it says nothing about it: no schema was ever fetched, and
 * asking for one answers the smallest schema its channel accepts.
 */
export function defaultGraphql(): GraphqlArea {
    return {
        readSchema: () => Promise.resolve(success(null)),
        introspect: () =>
            Promise.resolve(
                success({
                    fetchedAt: '1970-01-01T00:00:00.000Z',
                    introspection: { __schema: {} },
                }),
            ),
    };
}
