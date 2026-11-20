import type { PropsWithChildren } from 'react';

/**
 * The platform frame, drawn like the window of the apps: the header row above the body row, both
 * resting on the frame tone. It knows how tall it is (the
 * dynamic viewport, so browser chrome never pushes the frame out) and that only the content
 * track may scroll — the lanes of the rows below stay owned by their own pieces.
 */
export function LabShell({ children }: PropsWithChildren) {
    return (
        <div
            className="grid h-dvh grid-rows-[auto_minmax(0,1fr)] bg-surface-frame text-text-primary"
            data-part="lab-shell"
        >
            {children}
        </div>
    );
}
