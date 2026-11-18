import type { PropsWithChildren } from 'react';

import { useDeclaration } from '../../declare/useDeclaration.js';
import { EMPTY_GROUP_ID, emptyGroupDeclarations } from '../../grid/empty-group-registry.js';

type EmptyGroupProps = PropsWithChildren;

/**
 * Declares what a group of this window shows while no tab is open in it. The answer is of the
 * window and not of a kind: a group with nothing in it has no kind to ask.
 */
export function EmptyGroup({ children }: EmptyGroupProps) {
    useDeclaration(emptyGroupDeclarations, { id: EMPTY_GROUP_ID }, 'content', children);

    return null;
}
