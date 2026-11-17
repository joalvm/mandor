import { useMessages } from '@mandor/i18n';
import type { CollectionItemExample, CollectionItemNode } from '@mandor/schema';
import { InlineNameInput, RowLabel, TreeRow } from '@mandor/ui';
import { useState } from 'react';
import { useStore } from 'zustand';
import { fireAndForget, originName } from '@mandor/shell';

import { collectionStore } from '../../collection-store.js';
import { useExampleDrag } from '../../hooks/useExampleDrag.js';
import { useItemLeaf } from '../../hooks/useItemLeaf.js';
import { ItemProvider } from '../../item-context.js';
import { exampleResource } from '../../lib/example-resource.js';
import { exampleRowId } from '../../lib/example-row-id.js';
import { CollectionExampleMenu } from './CollectionExampleMenu.js';

type ExamplePartProps = {
    example: CollectionItemExample;
    node: CollectionItemNode;
    workspaceId: string;
};

type CollectionExampleRowProps = ExamplePartProps & { level: number };

/**
 * One response example of an item, drawn as a line of the tree a level inside its item: the code
 * of its status where the glyph of a node would be, its name — or the field that renames it, in
 * the same place — and the menu of what can be done to it. What the code looks like is the app's,
 * and a kind that declared no mark gets the plain text of the code. It can be carried to another
 * item, except while its name is being typed: a pointer pressed there is choosing letters.
 */
export function CollectionExampleRow({
    example,
    level,
    node,
    workspaceId,
}: CollectionExampleRowProps) {
    const rowId = exampleRowId(node.path, example.key);
    const renaming = useStore(collectionStore, (state) => state.renaming === rowId);
    const [element, setElement] = useState<HTMLDivElement | null>(null);

    useExampleDrag(renaming ? null : element, {
        fromPath: node.path,
        itemKind: node.itemKind,
        resource: exampleResource(originName(), workspaceId, node.path, example.key),
    });

    return (
        <div
            data-level={String(level)}
            data-part="collection-example-row"
            data-path={rowId}
            ref={setElement}
            role="presentation"
        >
            <TreeRow>
                <ExampleMark example={example} node={node} workspaceId={workspaceId} />
                <ExampleName example={example} node={node} workspaceId={workspaceId} />
                <CollectionExampleMenu example={example} node={node} workspaceId={workspaceId} />
            </TreeRow>
        </div>
    );
}

function ExampleMark({ example, node, workspaceId }: ExamplePartProps) {
    const resource = exampleResource(originName(), workspaceId, node.path, example.key);

    return (
        <span className="flex shrink-0 items-center" data-part="collection-example-mark">
            <ItemProvider value={{ resource, saved: example.mark }}>
                <ExampleCode code={example.mark} node={node} />
            </ItemProvider>
        </span>
    );
}

/** What the kind declared for the code of its examples, or the code written as plain text. */
function ExampleCode({ code, node }: { code: string | undefined; node: CollectionItemNode }) {
    const leaf = useItemLeaf(node.itemKind);

    if (leaf?.exampleMark !== undefined) {
        return leaf.exampleMark;
    }

    return <span className="text-2xs text-text-tertiary tabular-nums">{code ?? ''}</span>;
}

function ExampleName({ example, node, workspaceId }: ExamplePartProps) {
    const messages = useMessages('collections');
    const leaf = useItemLeaf(node.itemKind);
    const rowId = exampleRowId(node.path, example.key);
    const renaming = useStore(collectionStore, (state) => state.renaming === rowId);

    function commit(value: string): boolean {
        const name = value.trim();

        if (name.length === 0) {
            return false;
        }

        collectionStore.getState().setRenaming(null);
        fireAndForget(
            leaf?.examples?.rename(
                exampleResource(originName(), workspaceId, node.path, example.key),
                name,
            ) ?? Promise.resolve(),
        );

        return true;
    }

    if (renaming) {
        return (
            <InlineNameInput
                label={messages('renameField')}
                onCancel={() => {
                    collectionStore.getState().setRenaming(null);
                }}
                onCommit={commit}
                value={example.name}
            />
        );
    }

    return <RowLabel>{example.name}</RowLabel>;
}
