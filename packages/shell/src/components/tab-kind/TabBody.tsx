import type { PropsWithChildren } from 'react';

import { useTabPart } from './useTabPart.js';

type TabBodyProps = PropsWithChildren;

/** What the group shows while a tab of the kind is in front. It reads its tab with `useTab`. */
export function TabBody({ children }: TabBodyProps) {
    useTabPart('body', children);

    return null;
}
