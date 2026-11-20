import { TabBody, TabKind } from '@mandor/shell';
import { Card } from '@mandor/ui';

import { DOCS_SECTION_ID } from './components/sidebar/DocsSection.js';
import { DocPreviewTab } from './components/tab/DocPreviewTab.js';
import { docPreviewTitle, subscribeDocTitles } from './doc-tab-kinds.js';

/**
 * The preview kind. It is a tab like any other of the same resource, so it can stay beside the
 * editor or be sent to the group next door with the commands the shell already has.
 */
export function DocPreviewTabKind() {
    return (
        <TabKind
            closable
            icon="duplicate"
            id="doc-preview"
            section={DOCS_SECTION_ID}
            subscribeTitles={subscribeDocTitles}
            title={docPreviewTitle}
        >
            <TabBody>
                <Card>
                    <DocPreviewTab />
                </Card>
            </TabBody>
        </TabKind>
    );
}
