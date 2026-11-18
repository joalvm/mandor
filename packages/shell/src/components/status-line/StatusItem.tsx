import type { PropsWithChildren } from 'react';

import { useDeclaration } from '../../declare/useDeclaration.js';
import { statusItemDeclarations, type StatusItemLogic } from '../../status/status-item-registry.js';

/** The children are what the line draws for the piece. */
type StatusItemProps = PropsWithChildren<StatusItemLogic>;

/** Hangs a piece on the right of the status line while it is mounted. */
export function StatusItem({ children, ...logic }: StatusItemProps) {
    useDeclaration(statusItemDeclarations, logic, 'content', children);

    return null;
}
