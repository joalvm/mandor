import { useLanguage, useMessages } from '@mandor/i18n';
import { Button, cn } from '@mandor/ui';

import type { GraphqlSchemaState, GraphqlSchemaView } from '../../lib/graphql-schema-view.js';
import { formatSchemaTime } from '../../lib/format-schema-time.js';

type GraphqlSchemaStatusProps = {
    /** Asks the server for its schema again. */
    onRefresh: () => void;
    schema: GraphqlSchemaView;
};

/**
 * What the query editor knows of the server it asks, and the one way to ask it again. The schema
 * is fetched when the person says so: a request that fires on its own at every edit of the url
 * would reach servers nobody chose to reach.
 */
export function GraphqlSchemaStatus({ onRefresh, schema }: GraphqlSchemaStatusProps) {
    const errors = useMessages('errors');
    const labels = useMessages('requests');
    const language = useLanguage();
    const { error, fetchedAt, state } = schema;
    const kept = fetchedAt === null ? null : formatSchemaTime(fetchedAt, language);
    const said: Readonly<Record<GraphqlSchemaState, string | null>> = {
        failed: error === null ? null : errors(error),
        loading: labels('graphqlSchemaFetching'),
        none: labels('graphqlSchemaNone'),
        ready: kept === null ? null : labels('graphqlSchemaOf', { time: kept }),
    };

    return (
        <div
            className="flex min-w-0 items-center gap-gap-control"
            data-part="graphql-schema-status"
            data-state={state}
        >
            <span
                className={cn(
                    'truncate text-xs text-text-secondary',
                    state === 'failed' && 'text-text-error',
                )}
            >
                {said[state]}
            </span>
            <Button loading={state === 'loading'} onClick={onRefresh} size="sm" variant="ghost">
                {schema.schema === null
                    ? labels('graphqlSchemaFetch')
                    : labels('graphqlSchemaRefresh')}
            </Button>
        </div>
    );
}
