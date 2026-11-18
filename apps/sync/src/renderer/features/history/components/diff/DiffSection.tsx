import { useId, type PropsWithChildren } from 'react';

type DiffSectionProps = PropsWithChildren<{
    title: string;
}>;

/** One part of a comparison under its name: the summary, the headers or the body. */
export function DiffSection({ children, title }: DiffSectionProps) {
    const headingId = useId();

    return (
        <section
            aria-labelledby={headingId}
            className="flex min-w-0 shrink-0 flex-col"
            data-part="diff-section"
        >
            <h2
                className="flex h-section shrink-0 items-center px-pad-panel text-sm font-semibold text-text-primary"
                id={headingId}
            >
                {title}
            </h2>
            {children}
        </section>
    );
}
