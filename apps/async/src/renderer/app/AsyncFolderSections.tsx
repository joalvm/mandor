import { FolderSection, FolderSectionBody } from '@mandor/collections';
import { FolderDocs } from '@mandor/docs';
import { useMessages } from '@mandor/i18n';

import { ConnectionFolderVariables } from '../features/connections/index.js';

/**
 * The sections the tab of a collection or a folder shows in Mandor Realtime, in this order. Each
 * body knows its group by the tab it is drawn in.
 */
export function AsyncFolderSections() {
    const messages = useMessages('collections');

    return (
        <>
            <FolderSection id="docs" label={messages('folderDocs')}>
                <FolderSectionBody>
                    <FolderDocs />
                </FolderSectionBody>
            </FolderSection>
            <FolderSection id="variables" label={messages('folderVariables')}>
                <FolderSectionBody>
                    <ConnectionFolderVariables />
                </FolderSectionBody>
            </FolderSection>
        </>
    );
}
