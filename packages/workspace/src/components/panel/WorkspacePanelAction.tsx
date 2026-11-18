import { useDeclaration } from '@mandor/shell';
import type { PropsWithChildren } from 'react';

import { workspacePanelActionDeclarations } from '../../panel-actions.js';

type WorkspacePanelActionProps = PropsWithChildren<{ id: string }>;

/** Declares an action beside the form of the workspaces page while it is mounted. */
export function WorkspacePanelAction({ children, id }: WorkspacePanelActionProps) {
    useDeclaration(workspacePanelActionDeclarations, { id }, 'content', children);

    return null;
}
