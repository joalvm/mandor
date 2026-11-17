import { TabBody, TabKind } from '@mandor/shell';

import { DOCS_SECTION_ID } from './components/sidebar/DocsSection.js';
import { DocTab } from './components/tab/DocTab.js';
import { docTabTitle, releaseDoc, subscribeDocTitles } from './doc-tab-kinds.js';

/**
 * The doc tab kind. The title lives in the list of the workspace, not in the resource, so the tab
 * is told when the list lands or a doc is renamed and reads its title again.
 */
export function DocTabKind() {
    return (
        <TabKind
            closable
            icon="doc"
            id="doc"
            release={releaseDoc}
            section={DOCS_SECTION_ID}
            subscribeTitles={subscribeDocTitles}
            title={docTabTitle}
        >
            <TabBody>
                <DocTab />
            </TabBody>
        </TabKind>
    );
}
