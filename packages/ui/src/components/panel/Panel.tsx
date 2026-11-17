import { useId, type PropsWithChildren } from 'react';

type PanelProps = PropsWithChildren<{
    title: string;
}>;

/**
 * One labeled region: a header that stays put and a body that scrolls under it.
 *
 * The header holds the name of the region and nothing else. What acts on the region belongs
 * where the region can be seen — a row's own menu, a button in the body — and a header that
 * accepted arbitrary controls would become the place everything is hung from.
 */
export function Panel({ children, title }: PanelProps) {
    const titleId = useId();

    return (
        <section
            className="flex min-h-0 min-w-0 flex-col bg-surface-app"
            aria-labelledby={titleId}
            data-part="panel"
        >
            <header className="flex h-section shrink-0 items-center gap-gap-control bg-surface-panel px-pad-panel">
                <h2 className="min-w-0 flex-1 truncate text-sm text-text-secondary" id={titleId}>
                    {title}
                </h2>
            </header>
            <div className="min-h-0 min-w-0 flex-1 overflow-auto" data-part="panel-body">
                {children}
            </div>
        </section>
    );
}
