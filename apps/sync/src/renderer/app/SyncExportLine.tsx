import { useCollectionRow } from '@mandor/collections';
import { ExportCollectionItem } from '@mandor/exchange';

/** The line of the menu of a collection that takes it out, for the collection it was drawn on. */
export function SyncExportLine() {
    const { node } = useCollectionRow();

    return <ExportCollectionItem collection={node.path} />;
}
