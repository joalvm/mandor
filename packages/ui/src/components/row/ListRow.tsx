import { useId, useRef, type PropsWithChildren } from 'react';

import { cn } from '../../lib/cn.js';
import { useInRowList } from './in-row-list.js';
import { activateRow, clickActivation, type RowActivation } from './row-activation.js';
import { RowNameProvider } from './row-name.js';
import { useRevealedRow } from './useRevealedRow.js';

/**
 * How close together the lines of a list stand. A `row` carries a glyph and a name with the air
 * of the scale around them. A `line` stands as tall as a row but lays itself out: it hands back
 * no gap and no inset, because what a timeline draws arranges its own columns. A `pair` keeps
 * the air of a row around two lines: a name, and what the list says of it under it. The start
 * inset of a row is the flat one — a row with a level reads its depth from `data-level`, and
 * the stylesheet turns that into the inset, where no utility stands above it.
 */
const DENSITY = {
    line: 'h-row',
    pair: 'h-row-pair gap-gap-icon-text pe-pad-control',
    row: 'h-row gap-gap-icon-text pe-pad-control',
} as const;

type ListRowProps = PropsWithChildren<{
    className?: string | undefined;
    density?: keyof typeof DENSITY | undefined;
    /** For a field that points at the row it walks to without leaving itself. */
    id?: string | undefined;
    /** How deep the row sits under the section title. Absent, the row carries no indent. */
    level?: number | undefined;
    /** Told once the row asked for in `revealed` is in view and holds the focus. */
    onRevealed?: (() => void) | undefined;
    onSelect: (activation: RowActivation) => void;
    /** Someone outside the list asked to show this row: it comes into view and takes the focus. */
    revealed?: boolean | undefined;
    selected: boolean;
    /** `-1` when the container around the list walks its rows itself, like the palette does. A
     * `RowList` around the row says so itself. */
    tabIndex?: number | undefined;
}>;

/**
 * A dense row that can be taken, with the mouse or with the keyboard, and says whether it is the
 * one that is taken. List state stays with the list. Its `density` picks one of the rhythms a
 * list of this product has: one line, or a line and what it says under it.
 *
 * What it shows is written inside it: a glyph, a `RowLabel`, whatever hangs at the end. The row
 * says how tall it is, how it answers to the pointer and how deep it sits — never what it is a
 * row of, which is why no list has to bend its contents into a shape this file imagined.
 *
 * A row with a level opens with the gutter a foldable row spends on its chevron, so the glyphs
 * of a list and the glyphs of a tree stand in the same column.
 *
 * What the row is called is the `RowLabel` written inside it, and nothing else in the box: a
 * status light and an options button are part of the row, not part of its name.
 */
export function ListRow({
    children,
    className,
    density = 'row',
    id,
    level,
    onRevealed,
    onSelect,
    revealed = false,
    selected,
    tabIndex,
}: ListRowProps) {
    const inList = useInRowList();
    const nameId = useId();
    const row = useRef<HTMLDivElement>(null);

    useRevealedRow(row, revealed, onRevealed);

    return (
        <div
            aria-labelledby={nameId}
            aria-selected={selected}
            className={cn(
                'group flex min-w-0 cursor-pointer items-center',
                DENSITY[density],
                'border border-transparent bg-transparent text-sm text-text-primary',
                'transition-colors duration-fast hover:veil',
                selected && 'bg-surface-selected',
                level === undefined && 'ps-pad-control',
                className,
            )}
            data-focus-frame=""
            data-level={level === undefined ? undefined : String(level)}
            data-part="list-row"
            id={id}
            onClick={(event) => {
                onSelect(clickActivation(event));
            }}
            onKeyDown={(event) => {
                activateRow(event, onSelect);
            }}
            ref={row}
            role="option"
            tabIndex={tabIndex ?? (inList ? -1 : 0)}
        >
            <RowGutter level={level} />
            <RowNameProvider value={nameId}>{children}</RowNameProvider>
        </div>
    );
}

function RowGutter({ level }: { level: ListRowProps['level'] }) {
    if (level === undefined) {
        return null;
    }

    return <span aria-hidden className="size-icon-sm shrink-0" data-part="row-gutter" />;
}
