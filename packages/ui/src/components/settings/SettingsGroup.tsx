import { useId, type PropsWithChildren } from 'react';

type SettingsGroupProps = PropsWithChildren<{
    title: string;
}>;

/**
 * A group of settings under one name: the rows that answer the same question — how the
 * request travels, how it follows a redirect, how it trusts the other end. The name is the
 * heading the group is announced by.
 */
export function SettingsGroup({ children, title }: SettingsGroupProps) {
    const headingId = useId();

    return (
        <section
            aria-labelledby={headingId}
            className="flex min-w-0 flex-col gap-gap-group"
            data-part="settings-group"
        >
            <h3 className="px-pad-control text-xs font-semibold text-text-primary" id={headingId}>
                {title}
            </h3>
            <div className="flex min-w-0 flex-col gap-gap-group" data-part="settings-rows">
                {children}
            </div>
        </section>
    );
}
