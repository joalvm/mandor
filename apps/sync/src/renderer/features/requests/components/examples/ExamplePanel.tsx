import { useMessages } from '@mandor/i18n';
import {
    exampleOverrides,
    exampleRequest,
    type RequestExample,
    type RequestItem,
    type Variable,
} from '@mandor/schema';
import {
    fireAndForget,
    useFailureToast,
    useKeepTab,
    usePaneDirection,
    useTab,
} from '@mandor/shell';
import { Card, SplitHalf, SplitPane } from '@mandor/ui';
import { useState, type KeyboardEvent, type PropsWithChildren } from 'react';

import { useExample } from '../../hooks/useExample.js';
import { useExampleSections } from '../../hooks/useExampleSections.js';
import { useExampleSend } from '../../hooks/useExampleSend.js';
import { useRequestEnvironment } from '../../hooks/useRequestEnvironment.js';
import { useRequestPlace } from '../../hooks/useRequestPlace.js';
import { declareVariables } from '../../lib/declare-variables.js';
import { editExample, saveExample } from '../../lib/example-draft-write.js';
import { keyIntent } from '../../lib/send-shortcut.js';
import { composeUrlOf } from '../../lib/url-query.js';
import { withPathRows } from '../../lib/with-path-rows.js';
import { RequestBreadcrumb } from '../bar/RequestBreadcrumb.js';
import { RequestSections } from '../panel/RequestSections.js';
import { ExampleBar } from './ExampleBar.js';
import { ExampleResponse } from './ExampleResponse.js';

/** Root of the tab of an example: the only component of it that reads the store. */
export function ExamplePanel() {
    const { resource } = useTab();
    const labels = useMessages('requests');
    const view = useExample(resource);
    const environment = useRequestEnvironment(view?.item ?? resource);
    const place = useRequestPlace(view?.item ?? resource);
    const notifyFailure = useFailureToast();
    const keep = useKeepTab();
    const { cancel, comparison, entry, send, sending } = useExampleSend(resource, view);
    const { review, schema, section, setSection } = useExampleSections(resource, view, entry);

    if (view === undefined) {
        return null;
    }

    const { example, item, parent, saved } = view;
    const request = exampleRequest(parent, example);

    /** An edit of the sections is kept as what differs from the request the example hangs from. */
    function onChange(changes: Partial<RequestItem>): void {
        const edited = { ...request, ...withPathRows(request, changes) };

        // An edited example is no longer a look the next click replaces.
        keep();
        editExample(resource, {
            ...example,
            request: exampleOverrides(parent, edited, saved.request),
        });
    }

    function onResponse(next: RequestExample): void {
        keep();
        editExample(resource, next);
    }

    function save(): void {
        fireAndForget(
            saveExample(resource).then((code) => {
                if (code !== null) {
                    notifyFailure(code);
                }
            }),
        );
    }

    function declare(variables: readonly Variable[]): void {
        fireAndForget(declareVariables(item, environment, variables));
    }

    function onKeyDownCapture(event: KeyboardEvent<HTMLDivElement>): void {
        keyIntent(event, { save, send });
    }

    return (
        <div
            aria-label={labels('examplePanelLabel')}
            className="flex h-full min-h-0 flex-col gap-gap-gutter"
            data-part="example-panel"
            onKeyDownCapture={onKeyDownCapture}
            role="group"
        >
            <Card aria-label={labels('targetLabel')} size="content">
                <RequestBreadcrumb
                    name={example.name}
                    trail={[...place.trail, place.name ?? parent.name]}
                />
                <ExampleBar
                    environment={environment}
                    method={parent.method}
                    onCancel={cancel}
                    onSend={send}
                    requestName={place.name ?? parent.name}
                    sending={sending}
                    url={composeUrlOf(parent.url, request.query)}
                />
            </Card>
            <ExampleSplit label={labels('resizeSplit')}>
                <SplitHalf>
                    <Card aria-label={labels('panelLabel')}>
                        <RequestSections
                            environment={environment}
                            onChange={onChange}
                            onVariablesChange={declare}
                            request={request}
                            resource={resource}
                        />
                    </Card>
                </SplitHalf>
                <SplitHalf>
                    <Card aria-label={labels('responseLabel')}>
                        <ExampleResponse
                            comparison={comparison}
                            entry={entry}
                            example={example}
                            modelKey={resource}
                            onChange={onResponse}
                            onSection={setSection}
                            review={review}
                            schema={schema}
                            section={section}
                        />
                    </Card>
                </SplitHalf>
            </ExampleSplit>
        </div>
    );
}

/** The request over or beside its response, split as the layout of the window stands them. */
function ExampleSplit({ children, label }: PropsWithChildren<{ label: string }>) {
    /** The request/response split is view state: it never persists. */
    const [split, setSplit] = useState(50);
    const direction = usePaneDirection();

    return (
        <SplitPane
            className="min-h-0 flex-1"
            direction={direction}
            gap="gutter"
            label={label}
            onValueChange={setSplit}
            value={split}
        >
            {children}
        </SplitPane>
    );
}
