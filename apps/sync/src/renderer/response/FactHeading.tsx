import type { PropsWithChildren } from 'react';

type FactHeadingProps = PropsWithChildren<{
    label: string;
    /** The figure the heading adds up to, at its far end. */
    value?: string | undefined;
}>;

/**
 * The first line of a detail panel: what it explains, and the figure it adds up to. A glyph
 * written inside it leads the line, in the ink of what is secondary unless it brings its own.
 */
export function FactHeading({ children, label, value }: FactHeadingProps) {
    return (
        <div
            className="flex min-w-0 items-center gap-gap-icon-text text-sm font-semibold"
            data-part="fact-heading"
        >
            <span
                aria-hidden="true"
                className="flex shrink-0 items-center text-text-secondary empty:hidden"
            >
                {children}
            </span>
            <span className="min-w-0 truncate">{label}</span>
            <HeadingValue value={value} />
        </div>
    );
}

function HeadingValue({ value }: Pick<FactHeadingProps, 'value'>) {
    if (value === undefined) {
        return null;
    }

    return <span className="ms-auto shrink-0 tabular-nums">{value}</span>;
}
