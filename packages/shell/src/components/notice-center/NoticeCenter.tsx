import { useMessages } from '@mandor/i18n';
import {
    Button,
    CornerCount,
    EmptyState,
    IconButton,
    Popover,
    PopoverPanel,
    PopoverTrigger,
} from '@mandor/ui';
import { useEffect, useState } from 'react';

import { useShellStore } from '../../hooks/useShellStore.js';
import { selectUnreadNotices, type Notice } from '../../notices.slice.js';
import { NOTICES_SURFACE } from '../../command/window-commands.js';
import { registerSurface } from '../../command/window-surface.js';
import { NoticeRow } from './NoticeRow.js';

/**
 * The bell of the status line and the list it opens: every warning and every error of the
 * session, kept after the toast that carried it was closed. Opening it reads everything in it.
 */
export function NoticeCenter() {
    const messages = useMessages('notices');
    const notices = useShellStore((state) => state.notices);
    const open = useShellStore((state) => state.noticesOpen);
    const unread = useShellStore(selectUnreadNotices);
    const setOpen = useShellStore((state) => state.setNoticesOpen);
    const markRead = useShellStore((state) => state.markNoticesRead);
    const dismiss = useShellStore((state) => state.dismissNotice);
    const clear = useShellStore((state) => state.clearNotices);

    useEffect(
        () =>
            registerSurface({
                id: NOTICES_SURFACE,
                open: (state) => {
                    state.setNoticesOpen(true);
                },
            }),
        [],
    );

    return (
        <Popover
            onOpenChange={(next) => {
                setOpen(next);
                markRead();
            }}
            open={open}
        >
            <CornerCount count={unread} tone="accent">
                <PopoverTrigger>
                    <IconButton
                        icon="bell"
                        iconSize="sm"
                        label={
                            unread === 0
                                ? messages('bell')
                                : messages('bellUnread', { count: unread })
                        }
                        size="xs"
                    />
                </PopoverTrigger>
            </CornerCount>
            <PopoverPanel label={messages('title')}>
                <NoticeList notices={notices} onClear={clear} onDismiss={dismiss} />
            </PopoverPanel>
        </Popover>
    );
}

type NoticeListProps = {
    notices: readonly Notice[];
    onClear: () => void;
    onDismiss: (id: string) => void;
};

function NoticeList({ notices, onClear, onDismiss }: NoticeListProps) {
    const messages = useMessages('notices');
    // The ages are told from the moment the list opened: the panel leaves when it closes, so the
    // next opening tells them again.
    const [now] = useState(Date.now);

    if (notices.length === 0) {
        return (
            <EmptyState
                description={messages('emptyDescription')}
                icon="bell"
                title={messages('emptyTitle')}
            />
        );
    }

    return (
        <section aria-label={messages('title')} className="flex flex-col gap-gap-control">
            <ul className="flex max-h-96 list-none flex-col overflow-y-auto">
                {notices.map((notice) => (
                    <NoticeRow key={notice.id} notice={notice} now={now} onDismiss={onDismiss} />
                ))}
            </ul>
            <Button onClick={onClear} size="sm" variant="ghost">
                {messages('clearAll')}
            </Button>
        </section>
    );
}
