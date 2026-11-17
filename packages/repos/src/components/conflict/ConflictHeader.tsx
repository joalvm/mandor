import { useMessages } from '@mandor/i18n';
import { StatusText } from '@mandor/ui';

type ConflictHeaderProps = {
    /** The step in front, counted from one. */
    current: number;
    /** What clashed: the name the file carries, or `''` when it carries none. */
    name: string;
    /** Which part of it the step is about. */
    part: string;
    total: number;
};

/**
 * What the person is answering now: the name of the entity and the part of it, as one title
 * that changes from step to step, and where the step stands among the others. One step has no
 * count to give.
 */
export function ConflictHeader({ current, name, part, total }: ConflictHeaderProps) {
    const messages = useMessages('conflicts');
    const shown = name === '' ? messages('unnamedFile') : name;

    return (
        <header
            className="flex min-w-0 items-center gap-gap-control px-pad-panel pt-gap-section"
            data-part="conflict-header"
        >
            <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-text-primary">
                {messages('stepTitle', { name: shown, part })}
            </h1>
            <StepCount current={current} total={total} />
        </header>
    );
}

function StepCount({ current, total }: Pick<ConflictHeaderProps, 'current' | 'total'>) {
    const messages = useMessages('conflicts');

    if (total <= 1) {
        return null;
    }

    return (
        <StatusText className="shrink-0 text-sm text-text-secondary tabular">
            {messages('step', { current, total })}
        </StatusText>
    );
}
