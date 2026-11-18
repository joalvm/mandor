import { itemPartsOf, useItem } from '@mandor/collections';
import { ItemPlaceContext } from '@mandor/env';
import { useMessages } from '@mandor/i18n';
import { itemParentOf, type Variable } from '@mandor/schema';
import { fireAndForget, useSplit } from '@mandor/shell';
import { SplitHalf, SplitPane } from '@mandor/ui';
import type { KeyboardEvent } from 'react';
import { useStore } from 'zustand';

import { useAnswerSchema } from '../../hooks/useAnswerSchema.js';
import { useExampleActions } from '../../hooks/useExampleActions.js';
import { useCurlPaste } from '../../hooks/useCurlPaste.js';
import { useRequest } from '../../hooks/useRequest.js';
import { useRequestEnvironment } from '../../hooks/useRequestEnvironment.js';
import { useRequestCode } from '../../hooks/useRequestCode.js';
import { useRequestPlace } from '../../hooks/useRequestPlace.js';
import { cancelItem } from '../../lib/cancel-item.js';
import { declareVariables } from '../../lib/declare-variables.js';
import { keepResponse } from '../../lib/keep-when-done.js';
import { keyIntent } from '../../lib/send-shortcut.js';
import { sendItem } from '../../lib/send-item.js';
import { composeUrlOf, splitUrlOf } from '../../lib/url-query.js';
import { requestsStore } from '../../requests-store.js';
import { IDLE_SEND } from '../../responses.slice.js';
import { RequestBar } from '../bar/RequestBar.js';
import { RequestBreadcrumb } from '../bar/RequestBreadcrumb.js';
import { RequestCodeDialog } from '../code/RequestCodeDialog.js';
import { SendResponse } from '../response/SendResponse.js';
import { RequestSections } from './RequestSections.js';
import { useRequestDraft } from './useRequestDraft.js';

/** Root of the requests feature: the only component that reads the store. Children get props. */
export function RequestPanel() {
    const { resource } = useItem();
    const labels = useMessages('requests');
    const request = useRequest(resource);
    const environment = useRequestEnvironment(resource);
    const entry = useStore(requestsStore, (state) => state.sends[resource] ?? IDLE_SEND);
    const [split, setSplit] = useSplit('request', 50);
    const pasteCurl = useCurlPaste(resource);
    const code = useRequestCode(resource);
    const place = useRequestPlace(resource);
    const examples = useExampleActions();
    const { edit, save } = useRequestDraft({ resource }, request);
    const schema = useAnswerSchema(resource, request, entry);
    const sending = entry.state === 'sending';

    function send(): void {
        if (!sending) {
            fireAndForget(sendItem(resource));
        }
    }

    if (request === undefined) {
        return null;
    }

    // Function declarations hoist above the guard, so they narrow the aliased const instead.
    const current = request;

    /** Every field of the request declares what it names in the environment in force. */
    function declare(variables: readonly Variable[]): void {
        fireAndForget(declareVariables(resource, environment, variables));
    }

    /**
     * Heard on the way down, before the field the keys were typed in: a line of text keeps its
     * keys from what holds it, and Ctrl+S or Ctrl+Enter typed in one still mean the request.
     */
    function onKeyDownCapture(event: KeyboardEvent<HTMLDivElement>): void {
        keyIntent(event, { save, send });
    }

    // A request of the collection resolves with the chain of its folder; a loose one with none.
    return (
        <ItemPlaceContext value={itemParentOf(itemPartsOf(resource)?.path ?? null)}>
            <div
                aria-label={labels('panelLabel')}
                className="flex h-full min-h-0 flex-col"
                data-part="request-panel"
                onKeyDownCapture={onKeyDownCapture}
                role="group"
            >
                <RequestBreadcrumb name={place.name ?? current.name} trail={place.trail} />
                <RequestBar
                    environment={environment}
                    method={current.method}
                    onCancel={() => {
                        fireAndForget(cancelItem(resource));
                    }}
                    onKeep={keepResponse(resource, entry, examples.saveResponse)}
                    onMethod={(method) => {
                        edit({ method });
                    }}
                    onOpenCode={code.show}
                    onPasteText={pasteCurl}
                    onSend={send}
                    onUrl={(line) => {
                        const { query, url } = splitUrlOf(line);

                        edit({ query, url });
                    }}
                    onVariablesChange={declare}
                    sending={sending}
                    url={composeUrlOf(current.url, current.query)}
                />
                <SplitPane
                    className="min-h-0 flex-1"
                    label={labels('resizeSplit')}
                    onValueChange={setSplit}
                    value={split}
                >
                    <SplitHalf>
                        <RequestSections
                            environment={environment}
                            onChange={edit}
                            onVariablesChange={declare}
                            request={current}
                            resource={resource}
                        />
                    </SplitHalf>
                    <SplitHalf>
                        <SendResponse
                            entry={entry}
                            onClear={() => {
                                requestsStore.getState().clearSend(resource);
                            }}
                            resource={resource}
                            schema={schema}
                        />
                    </SplitHalf>
                </SplitPane>
                <RequestCodeDialog {...code.dialog} />
            </div>
        </ItemPlaceContext>
    );
}
