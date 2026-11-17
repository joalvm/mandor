import { graphqlDiagnostics, graphqlSuggestions, operationsOf } from '@mandor/graphql';
import { useEditorIssueMessage, useMessages } from '@mandor/i18n';
import { useSplit } from '@mandor/shell';
import { CodeEditor, SplitHalf, SplitPane, type EditorVariables } from '@mandor/ui';
import { useMemo } from 'react';

import type { GraphqlSchemaAsk } from '../../hooks/useGraphqlSchema.js';
import { withGraphqlQuery, type GraphqlBodyValue } from '../../lib/graphql-body-query.js';
import { graphqlSchemaViewOf } from '../../lib/graphql-schema-view.js';
import { GraphqlSchemaStatus } from './GraphqlSchemaStatus.js';
import { OperationSelect } from './OperationSelect.js';

/** A query is longer than its variables. */
const GRAPHQL_SPLIT = 65;

type GraphqlBodyProps = {
    body: GraphqlBodyValue;
    modelKey: string;
    onChange: (body: GraphqlBodyValue) => void;
    schema: GraphqlSchemaAsk;
    /** What the editor of the variables reads of the `{{var}}` written in it. */
    variables: EditorVariables;
};

/**
 * The query over its variables, and above both the choice of operation when the document has
 * several, and beside it what is known of the schema: with one the query is checked against it
 * and suggests from it, and without one it is only checked for syntax. A syntax error is said
 * under the choice and the editors keep working: a query is broken most of the time it is being
 * written.
 */
export function GraphqlBody({ body, modelKey, onChange, schema, variables }: GraphqlBodyProps) {
    const labels = useMessages('requests');
    const issueMessage = useEditorIssueMessage();
    const [split, setSplit] = useSplit('graphql', GRAPHQL_SPLIT);
    const parsed = useMemo(() => operationsOf(body.query), [body.query]);
    const view = useMemo(() => graphqlSchemaViewOf(schema.facts), [schema.facts]);
    /** The editor compares these by identity: a new object each render would rebuild its providers. */
    const queryOptions = useMemo(
        () => ({
            check: graphqlDiagnostics(view.schema),
            wordWrap: 'on' as const,
            ...(view.schema === null ? {} : { suggest: graphqlSuggestions(view.schema) }),
        }),
        [view.schema],
    );
    const variablesOptions = useMemo(
        () => ({ translate: issueMessage, variables, wordWrap: 'on' as const }),
        [issueMessage, variables],
    );

    return (
        <div
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-gap-control"
            data-part="graphql-body"
        >
            <div className="flex min-w-0 items-center justify-between gap-gap-control">
                <OperationChoice body={body} onChange={onChange} parsed={parsed} />
                <GraphqlSchemaStatus onRefresh={schema.refresh} schema={view} />
            </div>
            <SyntaxNotice parsed={parsed} query={body.query} />
            <SplitPane
                className="min-h-0 flex-1"
                direction="column"
                label={labels('graphqlSplit')}
                initial={GRAPHQL_SPLIT}
                onValueChange={setSplit}
                value={split}
            >
                <SplitHalf>
                    <CodeEditor
                        labels={{ editor: labels('graphqlQuery') }}
                        language="graphql"
                        modelKey={`${modelKey}-graphql-query`}
                        onValueChange={(query) => {
                            onChange(withGraphqlQuery(body, query));
                        }}
                        options={queryOptions}
                        value={body.query}
                    />
                </SplitHalf>
                <SplitHalf>
                    <CodeEditor
                        labels={{ editor: labels('graphqlVariables') }}
                        language="jsonc"
                        modelKey={`${modelKey}-graphql-variables`}
                        onValueChange={(variables) => {
                            onChange({ ...body, variables });
                        }}
                        options={variablesOptions}
                        value={body.variables}
                    />
                </SplitHalf>
            </SplitPane>
        </div>
    );
}

function OperationChoice({
    body,
    onChange,
    parsed,
}: {
    body: GraphqlBodyValue;
    onChange: GraphqlBodyProps['onChange'];
    parsed: ReturnType<typeof operationsOf>;
}) {
    if (!parsed.ok) {
        return null;
    }

    return (
        <OperationSelect
            onValueChange={(operationName) => {
                onChange({ ...body, operationName });
            }}
            operations={parsed.operations}
            value={body.operationName}
        />
    );
}

function SyntaxNotice({
    parsed,
    query,
}: {
    parsed: ReturnType<typeof operationsOf>;
    query: string;
}) {
    if (parsed.ok || query.trim() === '') {
        return null;
    }

    return (
        <span className="truncate text-xs text-text-secondary" data-part="graphql-syntax">
            {parsed.message}
        </span>
    );
}
