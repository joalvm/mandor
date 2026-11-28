import { Icon, type IconName } from '@mandor/icons';
import { SIDEBAR_WIDTH } from '@mandor/ipc';
import { useMessages } from '@mandor/i18n';
import { Badge, IconButton, StatusText } from '@mandor/ui';
import { Fragment } from 'react';

import { useShellStore } from '../../hooks/useShellStore.js';
import { useStatusItems } from '../../status/status-item-registry.js';
import { type SyncNotice, syncNoticeOf } from '../../sync-notice.js';
import { ConsoleToggle } from './ConsoleToggle.js';
import { PaneLayoutToggle } from './PaneLayoutToggle.js';

type StatusLook = {
    glyph: IconName;
    spins: boolean;
    tone: 'error' | 'info' | 'success' | 'warning';
};

/**
 * How each standing reads: the tint of the pill and the glyph before its words, so it is told
 * apart by shape as well as by colour. Only the work in progress moves.
 */
const STATUS_LOOK: Readonly<Record<SyncNotice | 'ready', StatusLook>> = {
    ready: { glyph: 'check', spins: false, tone: 'success' },
    syncing: { glyph: 'loading', spins: true, tone: 'info' },
    syncConflict: { glyph: 'warning', spins: false, tone: 'warning' },
    syncFailed: { glyph: 'error', spins: false, tone: 'error' },
};

/**
 * The row inside the bottom zone. At its start, the switch of the lateral. At its end, whether
 * the open origin keeps in step with its remote, said in its few words — it works, it failed,
 * something clashed — and never why, on a pill of the tint of its tone with the glyph of its
 * standing; then what the features declare, and last the switches of the console and of the
 * layout of the panels, at the far end as in Postman. Where the work lives is not said here — a
 * path in the chrome is of no use to the user and names what the domain hides.
 *
 * The switch owns what it means to hide the lateral: a width of zero, and the width it had back
 * when it returns. Spelling that out in each window would be the same rule written twice.
 */
export function StatusLine() {
    const messages = useMessages('shell');
    const sidebarWidth = useShellStore((state) => state.panels.sidebarWidth);
    const setPanels = useShellStore((state) => state.setPanels);
    const notice = useShellStore((state) => syncNoticeOf(state.syncState)) ?? 'ready';
    const look = STATUS_LOOK[notice];
    const statusItems = useStatusItems();
    const hidden = sidebarWidth === 0;

    return (
        <div
            className="flex h-full items-center gap-gap-control px-pad-panel text-xs text-text-secondary"
            data-part="status-line"
        >
            <IconButton
                active={!hidden}
                icon="sidebar-left"
                iconSize="sm"
                label={messages(hidden ? 'sidebarShow' : 'sidebarHide')}
                onClick={() => {
                    setPanels({ sidebarWidth: hidden ? SIDEBAR_WIDTH.default : 0 });
                }}
                size="xs"
            />
            <div className="ms-auto flex items-center gap-gap-control">
                <StatusText>
                    <Badge tone={look.tone}>
                        <span
                            aria-hidden="true"
                            className="flex shrink-0 items-center"
                            data-glyph={look.glyph}
                            data-spin={look.spins ? '' : undefined}
                        >
                            <Icon name={look.glyph} size="sm" />
                        </span>
                        {messages(notice)}
                    </Badge>
                </StatusText>
                {statusItems.map((item) => (
                    <Fragment key={item.id}>{item.content}</Fragment>
                ))}
                <ConsoleToggle />
                <PaneLayoutToggle />
            </div>
        </div>
    );
}
