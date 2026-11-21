import { DocIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import { InlineNameInput, ListRow, RowLabel } from '@mandor/ui';
import { useStore } from 'zustand';
import {
    fireAndForget,
    originName,
    selectFrontResource,
    shellStore,
    useShellStore,
} from '@mandor/shell';

import { docsStore } from '../../docs-store.js';
import { docResource } from '../../lib/doc-resource.js';
import { openDoc } from '../../lib/open-doc.js';
import { renameDoc } from '../../lib/rename-doc.js';
import { DocRowMenu } from './DocRowMenu.js';

type DocRowProps = { name: string; title: string; workspaceId: string };

/**
 * One doc of the list: the glyph, the title — or the field that renames it, in the same place —
 * and the menu of what can be done to it.
 *
 * The row is named by the title the doc carries; the file it lives in is its address and is never
 * drawn. It is marked while the tab in front shows the doc, as an explorer follows the editor in
 * front; the focus stays where it was.
 */
export function DocRow({ name, title, workspaceId }: DocRowProps) {
    const renaming = useStore(docsStore, (state) => state.renaming === name);
    const resource = docResource(originName(), workspaceId, name);
    const revealed = useShellStore((state) => state.revealing === resource);
    const selected = useShellStore((state) => selectFrontResource(state) === resource);

    function commit(value: string): boolean {
        const renamed = value.trim();

        if (renamed.length === 0) {
            return false;
        }

        docsStore.getState().setRenaming(null);
        fireAndForget(renameDoc(workspaceId, name, renamed));

        return true;
    }

    return (
        <ListRow
            level={1}
            onRevealed={() => {
                shellStore.getState().setRevealing(null);
            }}
            onSelect={(activation) => {
                openDoc(workspaceId, name, {
                    aside: activation.altKey,
                    preview: !activation.keep,
                });
            }}
            revealed={revealed}
            selected={selected}
        >
            <DocIcon size="sm" />
            <DocRowName onCommit={commit} renaming={renaming} title={title} />
            <DocRowMenu name={name} />
        </ListRow>
    );
}

function DocRowName({
    onCommit,
    renaming,
    title,
}: {
    onCommit: (value: string) => boolean;
    renaming: boolean;
    title: DocRowProps['title'];
}) {
    const messages = useMessages('docs');
    const shellWords = useMessages('shell');

    if (renaming) {
        return (
            <InlineNameInput
                label={messages('renameField')}
                onCancel={() => {
                    docsStore.getState().setRenaming(null);
                }}
                onCommit={onCommit}
                value={title}
            />
        );
    }

    // A doc nothing could be read from still has a row: it says it has no name.
    return <RowLabel>{title === '' ? shellWords('untitled') : title}</RowLabel>;
}
