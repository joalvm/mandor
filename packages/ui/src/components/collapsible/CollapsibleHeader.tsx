import { Collapsible as CollapsiblePrimitive } from 'radix-ui';
import { createContext, type PropsWithChildren } from 'react';
import { ChevronRightIcon } from '@mandor/icons';

/** True under the header of a section, where an `IconButton` takes the header's own box, glyph and ink. */
export const HeaderActionsContext = createContext(false);

type CollapsibleHeaderProps = PropsWithChildren<{
    title: string;
}>;

/**
 * The line that names the region and folds it. It reads as a heading, not as a row: in capitals,
 * smaller than the lines under it and a weight heavier, with the same ink — the hierarchy is
 * case, size and weight, never colour. The chevron is the header's own — it says which way the region
 * is, not something a caller decides to hang there — and which way it points is decided by the
 * state radix writes on the trigger, once in `runtime.css` for every header.
 *
 * What the caller writes inside is what applies to the whole region: the button that adds to it,
 * the menu that empties it. It sits after the title and outside the trigger, because a button
 * inside a button is not a thing a browser can resolve. Not every region has one — a list that
 * is only read is named and folded like any other — so the line closes after the title. The
 * buttons are the header's chrome, not the caller's choice: they stand flush against the end
 * edge, and an `IconButton` written inside takes the small box, glyph and ink on its own.
 */
export function CollapsibleHeader({ children, title }: CollapsibleHeaderProps) {
    return (
        <div
            className="flex h-section shrink-0 items-center gap-gap-control px-pad-panel"
            data-part="collapsible-header"
        >
            <CollapsiblePrimitive.Trigger
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-gap-icon-text rounded-sm border border-transparent bg-transparent text-left text-2xs font-semibold tracking-wide text-text-primary uppercase"
                data-focus-frame=""
            >
                <span
                    className="flex shrink-0 items-center text-text-secondary transition-transform duration-fast"
                    data-part="collapsible-chevron"
                >
                    <ChevronRightIcon size="sm" />
                </span>
                <span className="min-w-0 truncate">{title}</span>
            </CollapsiblePrimitive.Trigger>
            <span
                className="flex shrink-0 items-center empty:hidden"
                data-part="collapsible-actions"
            >
                <HeaderActionsContext value>{children}</HeaderActionsContext>
            </span>
        </div>
    );
}
