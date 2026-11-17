import { useMessages } from '@mandor/i18n';
import type { Origin } from '@mandor/schema';
import type { SyncNotice } from '@mandor/shell';
import { Table, TableHead, TableHeaderCell, TableTools, type TableColumn } from '@mandor/ui';

import { type OriginCheckState, originHealthOf } from '../../lib/origin-health.js';
import { OriginRow } from './OriginRow.js';

type OriginTableProps = {
    origins: readonly Origin[];
    activeOriginId: string | null;
    checks: Readonly<Record<string, OriginCheckState>>;
    /** What the open origin says of its synchronization; the row of that origin is the one that shows it. */
    notice: SyncNotice | null;
    renamingId: string | null;
    onRenameRequest: (origin: Origin) => void;
    onRenameCommit: (origin: Origin, name: string) => boolean;
    onRenameCancel: () => void;
    onCheck: (origin: Origin) => void;
    onEmpty: (origin: Origin) => void;
    onRemove: (origin: Origin) => void;
};

const COLUMNS: readonly TableColumn[] = [
    { id: 'origin', kind: 'fluid', min: 'md', weight: 1 },
    { id: 'address', kind: 'fluid', min: 'md', weight: 1.6 },
    { id: 'status', kind: 'fluid', min: 'sm', weight: 0.7 },
];

/**
 * The origins as a table: the glyph of each, where the work lives, and whether it answers. The
 * status column is not decoration — it is the check the panel runs for every remote origin, the
 * answer to the question this tab exists for.
 */
export function OriginTable({
    origins,
    activeOriginId,
    checks,
    notice,
    renamingId,
    onRenameRequest,
    onRenameCommit,
    onRenameCancel,
    onCheck,
    onEmpty,
    onRemove,
}: OriginTableProps) {
    const messages = useMessages('origins');

    return (
        <Table columns={COLUMNS} label={messages('heading')}>
            <TableHead>
                <TableHeaderCell column="origin">{messages('columnOrigin')}</TableHeaderCell>
                <TableHeaderCell column="address">{messages('columnAddress')}</TableHeaderCell>
                <TableHeaderCell column="status">{messages('columnStatus')}</TableHeaderCell>
                <TableTools label={messages('columnActions')} />
            </TableHead>
            <tbody data-part="origin-table">
                {origins.map((origin) => (
                    <OriginRow
                        active={origin.id === activeOriginId}
                        health={originHealthOf(origin, checks[origin.id])}
                        key={origin.id}
                        notice={origin.id === activeOriginId ? notice : null}
                        onCheck={() => {
                            onCheck(origin);
                        }}
                        onEmpty={() => {
                            onEmpty(origin);
                        }}
                        onRemove={() => {
                            onRemove(origin);
                        }}
                        onRenameCancel={onRenameCancel}
                        onRenameCommit={(name) => {
                            return onRenameCommit(origin, name);
                        }}
                        onRenameRequest={() => {
                            onRenameRequest(origin);
                        }}
                        origin={origin}
                        renaming={origin.id === renamingId}
                    />
                ))}
            </tbody>
        </Table>
    );
}
