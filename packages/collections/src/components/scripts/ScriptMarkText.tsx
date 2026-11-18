import type { PropsWithChildren } from 'react';

/**
 * What a mark of the scripts says: it takes the room the line has and folds before it runs off,
 * and a hint written under it goes on a line of its own.
 */
export function ScriptMarkText({ children }: PropsWithChildren) {
    return (
        <span className="flex min-w-0 flex-1 flex-col break-words" data-part="script-mark-text">
            {children}
        </span>
    );
}
