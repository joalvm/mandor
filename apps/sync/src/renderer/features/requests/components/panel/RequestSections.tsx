import { useMessages } from '@mandor/i18n';
import type { Environment, RequestItem, Variable } from '@mandor/schema';
import { useResourceSection } from '@mandor/shell';
import {
    Tabs,
    TabsList,
    TabsPanel,
    TabsStrip,
    TabsTab,
    useSchemaChecker,
    useSettledValue,
} from '@mandor/ui';
import { useMemo } from 'react';

import { CookiesButton } from '../../../cookies/index.js';
import { changesOfBody } from '../../lib/body-change.js';
import { DEFAULT_REQUEST_SECTION, openSectionOf, sectionsOf } from '../../lib/request-section.js';
import { bodyVerdict } from '../../lib/request-verdict.js';
import { marksOf } from '../../lib/section-marks.js';
import { useBodySchemaGeneration } from '../../hooks/useBodySchemaGeneration.js';
import { useGraphqlSchema } from '../../hooks/useGraphqlSchema.js';
import { RequestBodyEditor } from '../body/RequestBodyEditor.js';
import { RequestBodySchema } from '../body/RequestBodySchema.js';
import { RequestScripts } from '../scripts/RequestScripts.js';
import { RequestSectionBody } from './RequestSectionBody.js';
import { RequestVariablePanels } from './RequestVariablePanels.js';
import { RequestSettingsForm } from '../settings/RequestSettingsForm.js';
import { RequestDescription } from './RequestDescription.js';

type RequestSectionsProps = {
    environment: Environment | undefined;
    /** What changed in the request, as a patch: the owner decides how and when it is written. */
    onChange: (changes: Partial<RequestItem>) => void;
    /** The variables a field names and nobody declared, handed over to be declared. */
    onVariablesChange: (variables: readonly Variable[]) => void;
    request: RequestItem;
    resource: string;
};

/**
 * The halves of the request a person edits, one tab each. Which one is open is filed under the
 * resource, so a tab moved between groups comes back on the section it was left on.
 */
export function RequestSections({
    environment,
    onChange,
    onVariablesChange,
    request,
    resource,
}: RequestSectionsProps) {
    const labels = useMessages('requests');
    const [remembered, setSection] = useResourceSection(resource, DEFAULT_REQUEST_SECTION);
    const sections = sectionsOf(request);
    const section = openSectionOf(remembered, sections);
    const schema = useGraphqlSchema(resource, request, request.body.type === 'graphql');
    const { body, bodySchema } = request;
    const checked = useSchemaChecker();
    const written = useMemo(() => ({ body, bodySchema }), [body, bodySchema]);
    // Read once the typing pauses: parsing a body of megabytes at every key lagged it.
    const settled = useSettledValue(written, resource);
    const broken = useMemo(
        () => (checked ? bodyVerdict(settled.body, settled.bodySchema) : []),
        [checked, settled],
    );
    const generation = useBodySchemaGeneration(request, onChange);

    return (
        <Tabs onValueChange={setSection} value={section}>
            <TabsStrip>
                <TabsList label={labels('sections')}>
                    {sections.map((each) => (
                        <TabsTab
                            key={each}
                            label={labels(each)}
                            value={each}
                            {...marksOf(request, each, broken.length > 0)}
                        />
                    ))}
                </TabsList>
                <CookiesButton />
            </TabsStrip>
            <RequestVariablePanels
                environment={environment}
                onChange={onChange}
                onFollow={setSection}
                onVariablesChange={onVariablesChange}
                request={request}
                resource={resource}
            />
            <TabsPanel value="body">
                <RequestSectionBody>
                    <RequestBodyEditor
                        body={body}
                        bodySchema={bodySchema}
                        environment={environment}
                        modelKey={resource}
                        onChange={(next) => {
                            onChange(changesOfBody(request, next));
                        }}
                        onGenerate={generation.generateBody}
                        onVariablesChange={onVariablesChange}
                        schema={schema}
                    />
                </RequestSectionBody>
            </TabsPanel>
            <TabsPanel value="schema">
                <RequestBodySchema
                    body={body}
                    broken={broken}
                    onGenerate={generation.generateSchema}
                    onSchemaChange={(next) => {
                        onChange({ bodySchema: next.trim() === '' ? undefined : next });
                    }}
                    resource={resource}
                    schema={bodySchema ?? ''}
                />
            </TabsPanel>
            <TabsPanel value="settings">
                <RequestSectionBody>
                    <RequestSettingsForm
                        onSettings={(settings) => {
                            onChange({ settings });
                        }}
                        settings={request.settings}
                    />
                </RequestSectionBody>
            </TabsPanel>
            <TabsPanel value="doc">
                <RequestSectionBody>
                    <RequestDescription
                        onChange={(description) => {
                            onChange({
                                description: description.trim() === '' ? undefined : description,
                            });
                        }}
                        resource={resource}
                        value={request.description ?? ''}
                    />
                </RequestSectionBody>
            </TabsPanel>
            <TabsPanel value="scripts">
                <RequestSectionBody>
                    <RequestScripts onChange={onChange} request={request} resource={resource} />
                </RequestSectionBody>
            </TabsPanel>
        </Tabs>
    );
}
