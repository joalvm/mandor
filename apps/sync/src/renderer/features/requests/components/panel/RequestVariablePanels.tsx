import { useMessages } from '@mandor/i18n';
import type { Environment, RequestItem, Variable } from '@mandor/schema';
import { TabsPanel } from '@mandor/ui';
import type { ReactNode } from 'react';

import { RequestAuth } from '../auth/RequestAuth.js';
import { RequestHeaders } from '../headers/RequestHeaders.js';
import { RequestPairs } from '../pairs/RequestPairs.js';
import { RequestSectionBody } from './RequestSectionBody.js';

type RequestVariablePanelsProps = {
    environment: Environment | undefined;
    /** What changed in the request, as a patch: the owner decides how and when it is written. */
    onChange: (changes: Partial<RequestItem>) => void;
    /** The section a deep link from a row the app adds lands on. */
    onFollow: (section: 'auth' | 'body') => void;
    /** The variables a field names and nobody declared, handed over to be declared. */
    onVariablesChange: (variables: readonly Variable[]) => void;
    request: RequestItem;
    resource: string;
};

/**
 * The panels whose fields speak variables, query, path, headers and auth: each reads its
 * names against the environment in force and hands the ones nobody declared to the same place,
 * so the popover of a name offers the declaration the same way wherever the name stands.
 */
export function RequestVariablePanels({
    environment,
    onChange,
    onFollow,
    onVariablesChange,
    request,
    resource,
}: RequestVariablePanelsProps): ReactNode {
    const labels = useMessages('requests');

    return (
        <>
            <TabsPanel value="params">
                <RequestSectionBody>
                    <RequestPairs
                        environment={environment}
                        lines={request.query}
                        onChange={(query) => {
                            onChange({ query });
                        }}
                        onVariablesChange={onVariablesChange}
                        title={labels('params')}
                    />
                </RequestSectionBody>
            </TabsPanel>
            <TabsPanel value="path">
                <RequestSectionBody>
                    <RequestPairs
                        environment={environment}
                        lines={request.pathParams}
                        onChange={(pathParams) => {
                            onChange({ pathParams });
                        }}
                        onVariablesChange={onVariablesChange}
                        title={labels('path')}
                    />
                </RequestSectionBody>
            </TabsPanel>
            <TabsPanel value="headers">
                <RequestSectionBody>
                    <RequestHeaders
                        environment={environment}
                        onChange={(headers) => {
                            onChange({ headers });
                        }}
                        onFollow={onFollow}
                        onVariablesChange={onVariablesChange}
                        request={request}
                        resource={resource}
                    />
                </RequestSectionBody>
            </TabsPanel>
            <TabsPanel value="auth">
                <RequestSectionBody>
                    <RequestAuth
                        environment={environment}
                        onChange={onChange}
                        onVariablesChange={onVariablesChange}
                        request={request}
                        resource={resource}
                    />
                </RequestSectionBody>
            </TabsPanel>
        </>
    );
}
