import { useMessages } from '@mandor/i18n';
import { useTab } from '@mandor/shell';

import { useFolderDescription } from '../../hooks/useFolderDescription.js';
import { folderOf } from '../../lib/folder-description.js';
import { scheduleFolderDescriptionWrite } from '../../lib/pending-folder-description-write.js';
import { DocDescription } from '../surface/DocDescription.js';

/**
 * The words of a collection or a folder, in the markdown every doc is written in. It knows its
 * group by the tab it is drawn in, and writes as it is typed.
 */
export function FolderDocs() {
    const messages = useMessages('docs');
    const { resource } = useTab();
    const { workspaceId, path } = folderOf(resource);
    const text = useFolderDescription(workspaceId, path);

    return (
        <div className="flex h-full min-h-0 flex-col" data-part="folder-docs">
            <DocDescription
                label={messages('folderDescription')}
                modelKey={resource}
                onChange={(description) => {
                    scheduleFolderDescriptionWrite(workspaceId, path, description);
                }}
                value={text ?? ''}
            />
        </div>
    );
}
