import type { PropsWithChildren } from 'react';

import { useTabPart } from './useTabPart.js';

type TabIndicatorProps = PropsWithChildren;

/** The mark drawn before the title of every tab of the kind. */
export function TabIndicator({ children }: TabIndicatorProps) {
    useTabPart('indicator', children);

    return null;
}
