import { FolderSection, FolderSectionBody } from '@mandor/collections';
import { FolderDocs } from '@mandor/docs';
import { FolderVariables } from '@mandor/env';
import { useMessages } from '@mandor/i18n';

import { FolderAuthSection, FolderHeaders, FolderScripts } from '../features/requests/index.js';

/**
 * The sections the tab of a collection or a folder shows in Mandor Request, in this order. Each
 * body knows its group by the tab it is drawn in.
 */
export function SyncFolderSections() {
    const messages = useMessages('collections');
    const requests = useMessages('requests');

    return (
        <>
            <FolderSection id="docs" label={messages('folderDocs')}>
                <FolderSectionBody>
                    <FolderDocs />
                </FolderSectionBody>
            </FolderSection>
            <FolderSection id="variables" label={messages('folderVariables')}>
                <FolderSectionBody>
                    <FolderVariables />
                </FolderSectionBody>
            </FolderSection>
            <FolderSection id="auth" label={requests('folderAuthSection')}>
                <FolderSectionBody>
                    <FolderAuthSection />
                </FolderSectionBody>
            </FolderSection>
            <FolderSection id="headers" label={requests('headers')}>
                <FolderSectionBody>
                    <FolderHeaders />
                </FolderSectionBody>
            </FolderSection>
            <FolderSection id="scripts" label={requests('scripts')}>
                <FolderSectionBody>
                    <FolderScripts />
                </FolderSectionBody>
            </FolderSection>
        </>
    );
}
