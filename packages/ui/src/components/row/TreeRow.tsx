import { ChevronRightIcon } from '@mandor/icons';
import { useEffect, useId, useRef, type PropsWithChildren } from 'react';

import { cn } from '../../lib/cn.js';
import { useTreeLine } from '../tree/tree-scope.js';
import { chevronPressed } from './chevron-pressed.js';
import { clickActivation, clickedOnRow } from './row-activation.js';
import { RowNameProvider } from './row-name.js';

type TreeRowProps = PropsWithChildren;

/**
 * One line of a `Tree`. Where it sits, whether it is open, whether it is taken and whether the
 * tabulator lands on it all come from the tree, so a row is written with nothing but what it
 * shows, and no feature can hand it a level or a selection the tree does not know about.
 *
 * The gutter is reserved on every line, so the glyphs of a level stand in one column and the
 * guides of the ancestors have a column of their own to come down. A tree that asks for
 * `chevrons` has each folder draw its mark there, turned by whether the folder is open; the
 * mark is pressed to fold the line and never to open it, and the side arrows do it from the
 * keyboard. Where it is off, folding is the click on the folder itself: the owner decides what
 * activating a line means, and for a folder it means folding. Without `chevrons` the gutter stays empty, as in the lateral, where the header
 * of the section above carries the only chevron.
 *
 * Everything after the gutter is written by the caller: the glyph of the node, its `RowLabel` or
 * the field that renames it, the menu that acts on it. What the row is called comes from that
 * `RowLabel`, so the name is written once and the tree announces the node and not the box.
 */
export function TreeRow({ children }: TreeRowProps) {
    const line = useTreeLine();
    const nameId = useId();
    const row = useRef<HTMLDivElement>(null);
    const { claimsFocus, onClaimed } = line;

    useEffect(() => {
        if (claimsFocus) {
            row.current?.focus({ preventScroll: true });
            onClaimed();
        }
    }, [claimsFocus, onClaimed]);

    return (
        // band-policy: level-indent — the start inset is the level of the row, one rule for
        // every tree in runtime.css; only the end stays here.
        <div
            aria-expanded={line.expanded}
            aria-labelledby={nameId}
            aria-level={line.level}
            aria-selected={line.selected}
            className={cn(
                'group flex min-w-0 cursor-pointer items-center gap-gap-icon-text pe-pad-control',
                'h-row border border-transparent text-sm text-text-primary',
                'transition-colors duration-fast hover:veil',
                line.selected === true ? 'bg-surface-selected' : 'bg-transparent',
            )}
            data-level={String(line.level)}
            data-part="tree-row"
            onClick={(event) => {
                if (!clickedOnRow(event)) {
                    return;
                }

                if (chevronPressed(event.target, line)) {
                    line.onToggle();

                    return;
                }

                line.onPress(clickActivation(event));
            }}
            onFocus={(event) => {
                if (event.target === event.currentTarget) {
                    line.onFocus();
                }
            }}
            onKeyDown={line.onKeyDown}
            ref={row}
            role="treeitem"
            tabIndex={line.tabStop ? 0 : -1}
        >
            <span
                aria-hidden
                className="flex size-icon-sm shrink-0 items-center justify-center"
                data-part="row-gutter"
            >
                <RowChevron visible={line.chevrons && line.expanded !== undefined} />
            </span>
            <RowNameProvider value={nameId}>{children}</RowNameProvider>
        </div>
    );
}

function RowChevron({ visible }: { visible: boolean }) {
    if (!visible) {
        return null;
    }

    return (
        <span
            className="flex items-center text-text-secondary transition-transform duration-fast"
            data-part="tree-chevron"
        >
            <ChevronRightIcon size="sm" />
        </span>
    );
}
