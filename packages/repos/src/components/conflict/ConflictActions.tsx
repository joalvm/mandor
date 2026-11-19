import { ChevronLeftIcon, ChevronRightIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import { Button } from '@mandor/ui';

type ConflictActionsProps = {
    /** A way out is in flight: every button waits for it. */
    busy?: boolean | undefined;
    /** Every question of every step has an answer: the one thing «Resolve» waits for. */
    complete: boolean;
    /** The step in front, counted from zero, and how many there are. */
    index: number;
    onKeepMine?: (() => void) | undefined;
    onNext: () => void;
    onPrevious: () => void;
    onResolve?: (() => void) | undefined;
    /** Whether the step in front has every answer. */
    stepDone: boolean;
    total: number;
    /** How many questions still wait, across all the steps. */
    unresolved: number;
};

/**
 * The foot of the tab. Left, how much is left to answer; right, the way out — keep everything
 * mine — and the way through: back and forward between the steps, which turns into «Resolve»
 * on the last one. Resolving waits for every answer and says so on the button, not in a banner.
 */
export function ConflictActions({
    busy = false,
    complete,
    index,
    onKeepMine,
    onNext,
    onPrevious,
    onResolve,
    stepDone,
    total,
    unresolved,
}: ConflictActionsProps) {
    const messages = useMessages('conflicts');
    const last = index >= total - 1;

    return (
        <footer
            className="flex h-header shrink-0 items-center gap-gap-control bg-surface-card px-pad-panel"
            data-part="conflict-actions"
        >
            <span className="mr-auto min-w-0 truncate text-sm text-text-secondary">
                {complete ? messages('ready') : messages('unresolved', { count: unresolved })}
            </span>
            <Button
                disabled={onKeepMine === undefined || busy}
                onClick={onKeepMine}
                variant="ghost"
            >
                {messages('keepMine')}
            </Button>
            <PreviousStep busy={busy} index={index} onPrevious={onPrevious} />
            <ForwardStep
                busy={busy}
                complete={complete}
                last={last}
                onNext={onNext}
                onResolve={onResolve}
                stepDone={stepDone}
                unresolved={unresolved}
            />
        </footer>
    );
}

function PreviousStep({
    busy,
    index,
    onPrevious,
}: Pick<ConflictActionsProps, 'index' | 'onPrevious'> & { busy: boolean }) {
    const messages = useMessages('conflicts');

    if (index <= 0) {
        return null;
    }

    return (
        <Button disabled={busy} onClick={onPrevious}>
            <ChevronLeftIcon size="sm" />
            {messages('previous')}
        </Button>
    );
}

function ForwardStep({
    busy,
    complete,
    last,
    onNext,
    onResolve,
    stepDone,
    unresolved,
}: Pick<ConflictActionsProps, 'complete' | 'onNext' | 'onResolve' | 'stepDone' | 'unresolved'> & {
    busy: boolean;
    last: boolean;
}) {
    const messages = useMessages('conflicts');

    if (last) {
        return (
            <Button
                disabled={!complete || onResolve === undefined}
                disabledReason={
                    complete ? undefined : messages('unresolved', { count: unresolved })
                }
                loading={busy}
                onClick={onResolve}
                variant="primary"
            >
                {messages('resolve')}
            </Button>
        );
    }

    return (
        <Button disabled={busy} onClick={onNext} variant={stepDone ? 'primary' : 'secondary'}>
            {messages('next')}
            <ChevronRightIcon size="sm" />
        </Button>
    );
}
