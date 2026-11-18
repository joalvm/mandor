import { WarningIcon } from '@mandor/icons';
import type { PropsWithChildren } from 'react';

type ScriptMarkProps = PropsWithChildren<{
    /** Which mark it is, for the styles and tests that tell one from another. */
    mark?: string | undefined;
}>;

/**
 * One thing the scripts changed on the way, on a line of its own after a warning glyph: what the
 * line says, and the way out when there is one. Where the line sits is its parent's.
 */
export function ScriptMark({ children, mark }: ScriptMarkProps) {
    return (
        <p
            className="flex min-w-0 shrink-0 items-center gap-gap-icon-text py-1 text-sm text-text-primary"
            data-mark={mark}
            data-part="script-mark"
        >
            <span className="flex size-icon-md shrink-0 items-center justify-center text-text-warning">
                <WarningIcon />
            </span>
            {children}
        </p>
    );
}
