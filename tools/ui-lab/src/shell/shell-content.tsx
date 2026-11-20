import { Card } from '@mandor/ui';
import type { PropsWithChildren } from 'react';

/**
 * The content track, drawn like the work of the apps: one card on the frame, apart from its edges
 * by the gutter the body leaves. Width overflow belongs to the pieces inside; the card keeps its
 * lane and only its inside scrolls, vertically.
 */
export function ShellContent({ children }: PropsWithChildren) {
    return (
        <main className="flex min-h-0 min-w-0" data-part="shell-content">
            <Card>
                <div className="min-h-0 flex-1 overflow-y-auto" data-part="shell-scroll">
                    {children}
                </div>
            </Card>
        </main>
    );
}
