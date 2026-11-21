import { Children, useRef, type PropsWithChildren } from 'react';

import { useRowWindow } from '../../hooks/useRowWindow.js';

import type { TreeHandlers } from './tree-actions.js';
import { tabStopOf, type TreeLine } from './tree-line.js';
import { lineScopeOf, type TreeDrawing } from './tree-drawing.js';
import { TreeLineProvider } from './tree-scope.js';
import { useTreeCommands } from './useTreeCommands.js';
import { useTreeFocus } from './useTreeFocus.js';
import { useTreeFollow } from './useTreeFollow.js';
import { useTreeReveal } from './useTreeReveal.js';

type TreeProps = PropsWithChildren<
    TreeHandlers & {
        /**
         * Draws a chevron in the gutter of every line that holds something, open or folded, and
         * pressing it folds the line. Off by default; a tree where nothing else says a line
         * opens — a list to choose from, the collections of the lateral — turns it on.
         */
        chevrons?: boolean | undefined;
        /**
         * The line that stands for what the window shows: each time it becomes this one, the tree
         * scrolls to it as soon as it is among the lines, and leaves the focus where it was.
         */
        followed?: string | null | undefined;
        label: string;
        lines: readonly TreeLine[];
        /** Told once the line asked for in `revealed` is on screen and holds the focus. */
        onRevealed?: (() => void) | undefined;
        /**
         * A line someone outside the tree asked to show: the tree scrolls to it and hands it the
         * focus as soon as it is among the lines, then says so through `onRevealed`.
         */
        revealed?: string | null | undefined;
        /** The ids taken. Absent, the tree takes no selection and says nothing about one. */
        selected?: readonly string[] | undefined;
    }
>;

const NOTHING: readonly string[] = [];

/**
 * A tree of nodes that someone else owns: it draws the lines it is handed, one `TreeRow` per
 * line and in the same order, and tells back what the user asked for. What is open and what is
 * taken stay with the owner, and the tree never keeps a copy that could drift from it.
 *
 * Everything that makes it a tree lives here once, for every tree of the window: the arrows,
 * the single tab stop, focus apart from selection, Ctrl and Shift to take many, Delete for what
 * is taken, and only the lines on screen in the DOM.
 */
export function Tree({
    children,
    chevrons = false,
    followed,
    label,
    lines,
    onRevealed,
    revealed,
    selected,
    ...handlers
}: TreeProps) {
    const scroller = useRef<HTMLDivElement>(null);
    const focus = useTreeFocus();
    const view = useRowWindow({
        count: lines.length,
        kept: [lines.findIndex((line) => line.id === focus.id)],
        keyOf: (index) => lines[index]?.id ?? index,
        scroller: () => scroller.current,
    });
    const taken = selected ?? NOTHING;

    useTreeReveal({ focus, lines, onRevealed, revealed, scrollTo: view.scrollTo });
    useTreeFollow({ followed, lines, scrollTo: view.scrollTo });

    const commands = useTreeCommands({
        ...handlers,
        focus,
        lines,
        scrollTo: view.scrollTo,
        scroller,
        selected: taken,
    });
    const rows = Children.toArray(children);
    const takenIds = new Set(taken);
    const drawing: TreeDrawing = {
        chevrons,
        commands,
        focus,
        lines,
        selected: selected === undefined ? undefined : takenIds,
        tabStop: tabStopOf(
            lines,
            view.drawn.map((line) => line.index),
            focus.id,
            takenIds,
        ),
    };

    return (
        <div
            aria-label={label}
            aria-multiselectable={selected === undefined ? undefined : true}
            className="min-h-0 flex-1 overflow-y-auto"
            data-part="tree"
            ref={scroller}
            role="tree"
        >
            <div data-part="tree-viewport" data-total-size={`${String(view.total)}px`}>
                {view.drawn.map(({ index, key, start }) => (
                    <div
                        data-chevrons={chevrons ? '' : undefined}
                        data-level={String(lines[index]?.level ?? 1)}
                        data-offset={`${String(start)}px`}
                        data-part="tree-line"
                        key={key}
                    >
                        <TreeLineProvider value={lineScopeOf(drawing, index)}>
                            {rows[index]}
                        </TreeLineProvider>
                    </div>
                ))}
            </div>
        </div>
    );
}
