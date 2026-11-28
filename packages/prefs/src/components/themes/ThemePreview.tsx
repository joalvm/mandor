import type { ThemeId } from '@mandor/schema';
import { cn } from '@mandor/ui';

type ThemePreviewProps = {
    theme: ThemeId;
};

type PreviewTabProps = {
    active: boolean;
};

/** One tab of the strip: the active one takes the background of the document, the rest the chrome's. */
function PreviewTab({ active }: PreviewTabProps) {
    return (
        <span
            className={cn(
                'h-3 w-9 rounded-t-sm',
                active && 'bg-surface-app',
                !active && 'bg-surface-control',
            )}
            data-part="preview-tab"
        />
    );
}

/**
 * The window in miniature: the sidebar, the tab strip, the address bar with its action and the
 * two panes. It is painted by the sheet of the theme through `data-theme`, so what the reader sees
 * is the theme itself and not a drawing of colours that would drift from it.
 */
export function ThemePreview({ theme }: ThemePreviewProps) {
    return (
        // band-policy: a picture of a whole window, not a row of the chrome of this one
        <div
            aria-hidden
            className="flex h-28 overflow-hidden rounded-md border border-border-subtle bg-surface-app"
            data-part="theme-preview"
            data-theme={theme}
        >
            <div className="flex w-1/4 flex-col gap-gap-tight border-e border-border-subtle bg-surface-panel p-pad-toggle">
                <span className="h-2 w-3/4 rounded-sm bg-surface-control" />
                <span className="h-2 w-full rounded-sm bg-surface-selected" />
                <span className="h-2 w-2/3 rounded-sm bg-surface-control" />
                <span className="h-2 w-5/6 rounded-sm bg-surface-control" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-end gap-gap-tight border-b border-border-subtle bg-surface-panel px-pad-toggle pt-pad-toggle">
                    <PreviewTab active />
                    <PreviewTab active={false} />
                </div>
                <div className="flex items-center gap-gap-tight p-pad-toggle">
                    <span className="h-3 flex-1 rounded-sm border border-border-strong bg-surface-sunken" />
                    <span className="h-3 w-7 rounded-sm bg-solid-accent" />
                </div>
                <div className="flex flex-1 items-stretch gap-gap-tight px-pad-toggle pb-pad-toggle">
                    <span className="flex-1 rounded-sm border border-border-subtle" />
                    <span className="flex-1 rounded-sm bg-surface-panel" />
                </div>
            </div>
        </div>
    );
}
