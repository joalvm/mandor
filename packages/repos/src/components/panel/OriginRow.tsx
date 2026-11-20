import { useMessages } from '@mandor/i18n';

import type { Origin } from '@mandor/schema';
import type { SyncNotice } from '@mandor/shell';
import { InlineNameInput, StatusDot, TableRowActions } from '@mandor/ui';

import { healthDotState, type OriginHealth } from '../../lib/origin-health.js';
import { originDisplayOf } from '../../lib/origin-display.js';
import { OriginRowMenu } from '../menu/OriginRowMenu.js';

type OriginRowProps = {
    origin: Origin;
    active: boolean;
    health: OriginHealth;
    /** What the origin says of its synchronization in place of its health; `null` for a quiet one. */
    notice: SyncNotice | null;
    renaming: boolean;
    onRenameRequest: () => void;
    /** Answers whether the name was worth asking main about; the input keeps the row otherwise. */
    onRenameCommit: (name: string) => boolean;
    onRenameCancel: () => void;
    onCheck: () => void;
    onEmpty: () => void;
    onRemove: () => void;
};

const NOTICE_DOTS = {
    syncConflict: 'connecting',
    syncFailed: 'error',
    syncing: 'connecting',
} as const;

const STATUS_KEYS = {
    available: 'statusAvailable',
    checking: 'statusChecking',
    reachable: 'statusReachable',
    unreachable: 'statusUnreachable',
} as const;

/**
 * One origin of the table: its glyph and host color, where the work lives, and whether it
 * answers — the state the whole redesign was after. The row is reading; the way in is the
 * origin selector of the window, not a place on this page.
 */
export function OriginRow({
    origin,
    active,
    health,
    notice,
    renaming,
    onRenameRequest,
    onRenameCommit,
    onRenameCancel,
    onCheck,
    onEmpty,
    onRemove,
}: OriginRowProps) {
    const messages = useMessages('origins');

    return (
        <tr data-active={active} data-part="origin-row">
            <td>
                <OriginName
                    onCancel={onRenameCancel}
                    onCommit={onRenameCommit}
                    origin={origin}
                    renaming={renaming}
                />
            </td>
            <td className="text-text-secondary" data-part="origin-address">
                <span className="min-w-0 truncate">{origin.url ?? messages('localState')}</span>
            </td>
            <td className="gap-gap-icon-text text-text-secondary">
                <StatusDot
                    label={messages(notice ?? STATUS_KEYS[health])}
                    state={notice === null ? healthDotState(health) : NOTICE_DOTS[notice]}
                />
                <span className="min-w-0 truncate">{messages(notice ?? STATUS_KEYS[health])}</span>
            </td>
            <TableRowActions reveal="always">
                <OriginRowMenu
                    onCheck={onCheck}
                    onEmpty={onEmpty}
                    onRemove={onRemove}
                    onRename={onRenameRequest}
                    origin={origin}
                />
            </TableRowActions>
        </tr>
    );
}

function OriginName({
    onCancel,
    onCommit,
    origin,
    renaming,
}: {
    onCancel: OriginRowProps['onRenameCancel'];
    onCommit: OriginRowProps['onRenameCommit'];
    origin: OriginRowProps['origin'];
    renaming: boolean;
}) {
    const messages = useMessages('origins');
    const display = originDisplayOf(origin);
    const Glyph = display.component;

    if (renaming) {
        return (
            <InlineNameInput
                label={messages('addName')}
                onCancel={onCancel}
                onCommit={onCommit}
                value={origin.name}
            />
        );
    }

    return (
        <span className="flex min-w-0 items-center gap-gap-icon-text">
            <span
                aria-hidden="true"
                className="flex shrink-0 items-center"
                data-host={display.host}
            >
                <Glyph />
            </span>
            <span className="min-w-0 truncate">{origin.name}</span>
        </span>
    );
}
