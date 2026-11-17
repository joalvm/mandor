import type { PropsWithChildren } from 'react';

/**
 * The rows that only mean something while the row above them is on: written under it, one
 * step in, on the faintest veil over the surface, so they read as one tray hanging from that
 * row. The step moves only the text: the controls keep the column the section lines them up
 * in, since that column hangs from the right edge. Whoever owns the switch
 * decides whether they are written at all — what a setting promises grows where it is
 * promised, and is gone when the promise is.
 */
export function SettingDependents({ children }: PropsWithChildren) {
    return (
        <div
            className="flex min-w-0 flex-col gap-gap-group rounded-md bg-surface-tray py-pad-panel pl-pad-panel"
            data-part="setting-dependents"
        >
            {children}
        </div>
    );
}
