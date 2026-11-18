import { useDeclaredList } from '@mandor/shell';
import { Fragment } from 'react';

import { collectionsSectionActionDeclarations } from '../../collection-actions.js';

/** What the app declared into the header of the section, one after the other. */
export function CollectionsSectionActions() {
    const actions = useDeclaredList(collectionsSectionActionDeclarations);

    return (
        <>
            {actions.map((action) => (
                <Fragment key={action.id}>{action.content}</Fragment>
            ))}
        </>
    );
}
