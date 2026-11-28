import { Direction } from 'radix-ui';
import type { PropsWithChildren } from 'react';

import type { WritingDirection } from '../../hooks/useWritingDirection.js';

type TextDirectionProps = PropsWithChildren<{ dir: WritingDirection }>;

/**
 * Which way the text of the window runs. The page says it on its root for the stylesheets; the
 * menus, tabs and sliders read it from here instead, to know which arrow key goes forward and to
 * which side a submenu opens.
 */
export function TextDirection({ children, dir }: TextDirectionProps) {
    return <Direction.Provider dir={dir}>{children}</Direction.Provider>;
}
