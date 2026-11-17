import { useMessages } from '@mandor/i18n';
import type { HttpResponse, ScriptTest } from '@mandor/schema';
import { useResourceSection } from '@mandor/shell';
import { Tabs, TabsList, TabsPanel, TabsStrip, TabsTab } from '@mandor/ui';
import type { PropsWithChildren } from 'react';

import { GraphqlErrorList } from './GraphqlErrorList.js';
import { ResponseBody } from './ResponseBody.js';
import { ResponseCookies } from './ResponseCookies.js';
import { ResponseHeaders } from './ResponseHeaders.js';
import { ResponseSchema, type AnswerSchema } from './ResponseSchema.js';
import { ResponseSummary } from './ResponseSummary.js';
import { ScriptTestsTab } from './ScriptTestsTab.js';

type ResponsePanelProps = PropsWithChildren<{
    resource: string;
    response: HttpResponse;
    /** The schema of the example the answer stands for, when one has its status; it adds a section. */
    schema?: AnswerSchema | undefined;
    /** The cases the scripts of the send checked, when they checked some; it adds a section. */
    tests?: readonly ScriptTest[] | undefined;
}>;

/**
 * An answer in three sections, with its summary at the end of their strip: where the time went
 * and what it weighed open from the figures of the summary, not from a section of their own. It
 * reads no store: the answer of the last send and the one a stored send kept arrive the same
 * way, so both are drawn by the same views. Which section is open belongs to the resource, as
 * the sections of the request do: a tab moved, closed with the window or brought back finds the
 * answer on the section it was left on. A request with an example of the status that came adds
 * the section of its schema, written there and pointing at the rules the answer broke. A send
 * whose scripts checked cases adds them; what the scripts wrote goes to the console of the
 * window, not here. A stored send keeps no case, so the history draws the answer without them.
 */
export function ResponsePanel({ children, resource, response, schema, tests }: ResponsePanelProps) {
    const labels = useMessages('requests');
    const [chosen, setSection] = useResourceSection(resource, 'body', 'response');
    // A section that is not there goes with what fills it: the panel falls back to the body.
    const gone =
        (schema === undefined && chosen === 'schema') ||
        (tests === undefined && chosen === 'tests');
    const section = gone ? 'body' : chosen;

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col" data-part="response-panel">
            <div className="min-h-0 flex-1">
                <Tabs onValueChange={setSection} value={section}>
                    <TabsStrip>
                        <TabsList label={labels('responseSections')}>
                            <TabsTab label={labels('body')} value="body" />
                            <TabsTab
                                count={response.cookies.length}
                                label={labels('cookies')}
                                value="cookies"
                            />
                            <TabsTab
                                count={response.headers.length}
                                label={labels('headers')}
                                value="headers"
                            />
                            <SchemaTab schema={schema} />
                            <TestsTab tests={tests} />
                        </TabsList>
                        <ResponseSummary response={response}>{children}</ResponseSummary>
                    </TabsStrip>
                    <GraphqlErrors errors={response.graphqlErrors} />
                    <TabsPanel value="body">
                        <ResponseBody resource={resource} response={response} />
                    </TabsPanel>
                    <TabsPanel value="cookies">
                        <ResponseCookies cookies={response.cookies} />
                    </TabsPanel>
                    <TabsPanel value="headers">
                        <ResponseHeaders headers={response.headers} />
                    </TabsPanel>
                    <SchemaSection schema={schema} status={response.status} />
                    <TestsSection tests={tests} />
                </Tabs>
            </div>
        </div>
    );
}

function SchemaTab({ schema }: { schema: AnswerSchema | undefined }) {
    const labels = useMessages('requests');

    if (schema === undefined) {
        return null;
    }

    return (
        <TabsTab
            broken={schema.issues.length > 0}
            filled={schema.issues.length === 0 && schema.text.trim() !== ''}
            label={labels('exampleSchema')}
            value="schema"
        />
    );
}

type SchemaSectionProps = { schema: AnswerSchema | undefined; status: number };

function SchemaSection({ schema, status }: SchemaSectionProps) {
    if (schema === undefined) {
        return null;
    }

    return (
        <TabsPanel value="schema">
            <ResponseSchema {...schema} status={status} />
        </TabsPanel>
    );
}

/** A case that broke marks the section; a case that held does not. */
function TestsTab({ tests }: { tests: readonly ScriptTest[] | undefined }) {
    const labels = useMessages('requests');

    if (tests === undefined) {
        return null;
    }

    return (
        <TabsTab
            broken={tests.some((test) => !test.passed)}
            count={tests.length}
            label={labels('scriptTests')}
            value="tests"
        />
    );
}

function TestsSection({ tests }: { tests: readonly ScriptTest[] | undefined }) {
    if (tests === undefined) {
        return null;
    }

    return (
        <TabsPanel value="tests">
            <ScriptTestsTab tests={tests} />
        </TabsPanel>
    );
}

function GraphqlErrors({ errors }: { errors: HttpResponse['graphqlErrors'] }) {
    if (errors === undefined) {
        return null;
    }

    return <GraphqlErrorList errors={errors} />;
}
