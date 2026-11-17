import type { PropsWithChildren } from 'react';

import { useTabPart } from './useTabPart.js';

type TabStatusProps = PropsWithChildren;

/**
 * What a tab of the kind says at its end while nobody points at it; the close takes its place
 * on hover.
 */
export function TabStatus({ children }: TabStatusProps) {
    useTabPart('status', children);

    return null;
}
