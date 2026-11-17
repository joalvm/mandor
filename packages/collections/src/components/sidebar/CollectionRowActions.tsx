import { useDeclaredList } from '@mandor/shell';
import { Fragment } from 'react';

import {
    collectionRowActionDeclarations,
    type CollectionRowKind,
} from '../../collection-actions.js';

type CollectionRowActionsProps = { kind: CollectionRowKind };

/** The lines the app declared for the rows of this kind, one after the other. */
export function CollectionRowActions({ kind }: CollectionRowActionsProps) {
    const actions = useDeclaredList(collectionRowActionDeclarations);

    return (
        <>
            {actions
                .filter((action) => action.kind === kind)
                .map((action) => (
                    <Fragment key={action.id}>{action.content}</Fragment>
                ))}
        </>
    );
}
