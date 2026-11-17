import { useMessages } from '@mandor/i18n';
import type { ConflictSummary } from '@mandor/ipc';
import { openConflict } from '@mandor/shell';
import { Button, RowLabel } from '@mandor/ui';

type ConflictListProps = { conflicts: readonly ConflictSummary[] };

/**
 * What waits for an answer, listed where the origins are managed: one line per clash with the way
 * to its tab. It is not there while nothing clashes, so a quiet window shows no empty box.
 */
export function ConflictList({ conflicts }: ConflictListProps) {
    const messages = useMessages('origins');
    const conflictMessages = useMessages('conflicts');

    if (conflicts.length === 0) {
        return null;
    }

    return (
        <section
            aria-label={messages('conflictsList')}
            className="flex flex-col gap-gap-control"
            data-part="conflict-list"
        >
            <h2 className="text-sm font-semibold text-text-primary">
                {messages('conflictsHeading')}
            </h2>
            <ul className="flex flex-col gap-gap-control">
                {conflicts.map((conflict) => (
                    <li
                        className="flex items-center justify-between gap-gap-control"
                        data-part="conflict-list-row"
                        key={conflict.id}
                    >
                        <RowLabel>
                            {conflict.name === '' ? conflictMessages('unnamedFile') : conflict.name}
                        </RowLabel>
                        <Button
                            onClick={() => {
                                openConflict(conflict);
                            }}
                            size="sm"
                            variant="secondary"
                        >
                            {messages('resolveConflict')}
                        </Button>
                    </li>
                ))}
            </ul>
        </section>
    );
}
