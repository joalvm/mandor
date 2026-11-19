import { ItemProvider } from '@mandor/collections';
import { TabBody, TabIndicator, TabKind, TabStatus, TabStripAction, useTab } from '@mandor/shell';
import { Card } from '@mandor/ui';
import type { PropsWithChildren } from 'react';

import { RequestDraftMark } from './components/panel/RequestDraftMark.js';
import { RequestMethodMark } from './components/panel/RequestMethodMark.js';
import { RequestPanel } from './components/panel/RequestPanel.js';
import { SaveRequestDialog } from './components/save/SaveRequestDialog.js';
import { NewLooseRequestAction } from './components/strip/NewLooseRequestAction.js';
import { LOOSE_REQUEST_TAB_KIND } from './lib/loose-resource.js';
import { askWhereToSave } from './lib/save-any-request.js';
import { requestsStore } from './requests-store.js';

/** The tab of a request saved nowhere gives its parts the request the way an item's tab does. */
function AsRequest({ children }: PropsWithChildren) {
    const { resource } = useTab();

    return <ItemProvider value={{ resource, saved: undefined }}>{children}</ItemProvider>;
}

/**
 * A request that belongs to no collection yet, born from the add of the strip or from a curl. It
 * sends, resolves the environment of the workspace and files its sends in the history, as any
 * request does; what it lacks is a file. Saving it asks where it goes, and it goes on as the item
 * it became. It lives in the window — the session brings it back after a restart — and closing
 * its tab lets it go, asking first only when it was edited. Gone, it cannot be reopened.
 */
export function LooseRequestTabKind() {
    return (
        <>
            <TabStripAction id="new-request">
                <NewLooseRequestAction />
            </TabStripAction>
            <TabKind
                closable
                dirty={(_tabId, resource) =>
                    requestsStore.getState().pendings[resource] !== undefined
                }
                icon="send"
                id={LOOSE_REQUEST_TAB_KIND}
                release={(_tabId, resource) => {
                    requestsStore.getState().forget(resource);
                }}
                reopenable={false}
                save={(_tabId, resource) => askWhereToSave(resource, false)}
                subscribeTitles={(onChange) =>
                    requestsStore.subscribe((state, before) => {
                        if (state.requests !== before.requests) {
                            onChange();
                        }
                    })
                }
                title={(resource, translate) =>
                    requestsStore.getState().requests[resource]?.name ??
                    translate('requests:newRequest')
                }
            >
                <TabIndicator>
                    <AsRequest>
                        <RequestMethodMark />
                    </AsRequest>
                </TabIndicator>
                <TabBody>
                    <Card>
                        <AsRequest>
                            <RequestPanel />
                        </AsRequest>
                    </Card>
                </TabBody>
                <TabStatus>
                    <AsRequest>
                        <RequestDraftMark />
                    </AsRequest>
                </TabStatus>
            </TabKind>
            <SaveRequestDialog />
        </>
    );
}
