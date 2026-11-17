import { ItemProvider } from '@mandor/collections';
import { TabBody, TabIndicator, TabKind, TabStatus, useTab } from '@mandor/shell';
import type { PropsWithChildren } from 'react';

import { ExampleDraftMark } from './components/examples/ExampleDraftMark.js';
import { ExamplePanel } from './components/examples/ExamplePanel.js';
import { ExampleStatusMark } from './components/examples/ExampleStatusMark.js';
import { useExample } from './hooks/useExample.js';
import { saveExample } from './lib/example-draft-write.js';
import { exampleTabTitle } from './lib/example-tab-title.js';
import { EXAMPLE_TAB_KIND } from './lib/open-example.js';
import { releaseExample } from './lib/release-example.js';
import { requestsStore } from './requests-store.js';

/** The tab of an example gives its parts the status it stands for, the one in the window first. */
function AsExample({ children }: PropsWithChildren) {
    const { resource } = useTab();
    const view = useExample(resource);

    return (
        <ItemProvider value={{ resource, saved: view?.example.status }}>{children}</ItemProvider>
    );
}

/**
 * A response example opens in a tab of its own, the way a request does: the same sections on the
 * left and the answer it promises on the right. It lives inside the file of its request and is
 * written by this tab alone, only what it changes; closing it lets go of what was typed, asking
 * first when there is something to save.
 */
export function RequestExampleTabKind() {
    return (
        <TabKind
            closable
            dirty={(_tabId, resource) =>
                requestsStore.getState().exampleDrafts[resource] !== undefined
            }
            icon="send"
            id={EXAMPLE_TAB_KIND}
            release={(_tabId, resource) => {
                releaseExample(resource);
            }}
            save={(_tabId, resource) => saveExample(resource)}
            subscribeTitles={(onChange) =>
                requestsStore.subscribe((state, before) => {
                    if (state.requests !== before.requests) {
                        onChange();
                    }
                })
            }
            title={exampleTabTitle}
        >
            <TabIndicator>
                <AsExample>
                    <ExampleStatusMark />
                </AsExample>
            </TabIndicator>
            <TabBody>
                <ExamplePanel />
            </TabBody>
            <TabStatus>
                <ExampleDraftMark />
            </TabStatus>
        </TabKind>
    );
}
