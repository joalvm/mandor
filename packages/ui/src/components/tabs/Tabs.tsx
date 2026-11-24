import { Tabs as TabsPrimitive } from 'radix-ui';
import { useMemo, useRef, type PropsWithChildren } from 'react';

import type { SplitDirection } from '../split/split-axis.js';
import { useFitDirection, type SplitLayout } from '../split/useFitDirection.js';
import { TabsScopeProvider, type TabsOrientation } from './tabs-scope.js';

/** How the sections stand: always one way, or in a column only while the panels keep room. */
type TabsLayout = TabsOrientation | 'fit';

type TabsProps = PropsWithChildren<{
    onValueChange: (value: string) => void;
    /**
     * Side by side over the panels (the default), in a column beside them, or in that column only
     * while the panel beside it keeps room to be read, and over the panels when it does not.
     */
    orientation?: TabsLayout | undefined;
    value: string;
}>;

/**
 * The narrowest box that holds a column of sections beside its panel: under it, a column as wide
 * as its longest name leaves the panel too narrow to read a line of it.
 */
const COLUMN_ROOM = 400;

/** A column stands beside its panels like a half beside the other; a strip stands over them. */
const SPLIT_OF: Readonly<Record<TabsLayout, SplitLayout>> = {
    fit: 'fit',
    horizontal: 'column',
    vertical: 'row',
};

const ORIENTATION_OF: Readonly<Record<SplitDirection, TabsOrientation>> = {
    column: 'horizontal',
    row: 'vertical',
};

/** The list goes over the panels in a strip, or beside them in a column. */
const ROOT_OF: Readonly<Record<TabsOrientation, string>> = {
    horizontal: 'flex h-full min-h-0 min-w-0 flex-col',
    vertical: 'flex h-full min-h-0 min-w-0 flex-row gap-gap-control',
};

/**
 * A panel split into sections: the strip on top, the panels under it, written in that order by
 * whoever holds the panel.
 *
 * Which section is open belongs to the holder, never here. What each section contains is a tree
 * the holder writes inside its own `TabsPanel`, so a section can be an editor, a table or a form
 * without this file knowing any of them.
 *
 * Standing in a column, the sections are walked with the arrows up and down, and the list says so
 * to whoever reads it aloud.
 */
export function Tabs({ children, onValueChange, orientation = 'horizontal', value }: TabsProps) {
    const root = useRef<HTMLDivElement>(null);
    const standing = ORIENTATION_OF[useFitDirection(root, SPLIT_OF[orientation], COLUMN_ROOM)];
    const scope = useMemo(
        () => ({ choose: onValueChange, open: value, orientation: standing }),
        [onValueChange, standing, value],
    );

    return (
        <TabsPrimitive.Root
            className={ROOT_OF[standing]}
            data-orientation={standing}
            data-part="tabs"
            onValueChange={onValueChange}
            orientation={standing}
            ref={root}
            value={value}
        >
            <TabsScopeProvider value={scope}>{children}</TabsScopeProvider>
        </TabsPrimitive.Root>
    );
}
