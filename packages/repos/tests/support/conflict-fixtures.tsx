import { MessagesProvider } from '@mandor/i18n';
import type { ConflictDetail, ConflictItem } from '@mandor/ipc';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import type { ReactNode } from 'react';

import { conflictDrafts } from '../../src/lib/conflict-drafts.js';

const TOAST_WORDS = { close: 'Close', more: (count: number) => `${String(count)} more` };

export function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <ToastProvider messages={TOAST_WORDS}>{children}</ToastProvider>
            </TooltipProvider>
        </MessagesProvider>
    );
}

/** A store born anew, for a test that left answers in it. */
export function forgetDrafts(): void {
    conflictDrafts.setState(conflictDrafts.getInitialState(), true);
}

function pointOf(
    path: string[],
    shape: ConflictItem['shape'],
    sides: Partial<Pick<ConflictItem, 'base' | 'ours' | 'proposed' | 'theirs'>> = {},
): ConflictItem {
    return {
        base: null,
        id: path.join('/'),
        ours: null,
        path,
        shape,
        theirs: null,
        ...sides,
    };
}

export const ACCEPT = pointOf(['headers', 'Accept#0'], 'row', {
    base: { value: { key: 'Accept', value: 'text/plain' } },
    ours: { value: { key: 'Accept', value: 'text/html' } },
    theirs: { value: { key: 'Accept', value: 'application/json' } },
});

export const TRACE = pointOf(['headers', 'X-Trace#0'], 'row', {
    ours: { value: { key: 'X-Trace', value: 'on' } },
    theirs: null,
});

export const BODY = pointOf(['body', 'content'], 'text', {
    base: { value: 'one\ntwo\n' },
    ours: { value: 'one\nmine\n' },
    proposed: 'one\nmine\n',
    theirs: { value: 'one\ntheirs\n' },
});

/** A request that clashed in two rows of its headers and in its body. */
export const REQUEST_CLASH: ConflictDetail = {
    conflicts: [ACCEPT, TRACE, BODY],
    entity: { area: 'collections', path: 'users/get', workspaceId: 'payments' },
    id: 'aaaaaaaaaaaaaaaa',
    name: 'Get users',
};
