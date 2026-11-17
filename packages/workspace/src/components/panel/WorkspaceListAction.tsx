import { useDeclaration } from '@mandor/shell';
import type { PropsWithChildren } from 'react';

import { workspaceListActionDeclarations } from '../../list-actions.js';

type WorkspaceListActionProps = PropsWithChildren<{ id: string }>;

/** Declares an action that makes a workspace, beside the way in of the page, while it is mounted. */
export function WorkspaceListAction({ children, id }: WorkspaceListActionProps) {
    useDeclaration(workspaceListActionDeclarations, { id }, 'content', children);

    return null;
}
