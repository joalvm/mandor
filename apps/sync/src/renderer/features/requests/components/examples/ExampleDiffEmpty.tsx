import { useMessages } from '@mandor/i18n';
import { EmptyState } from '@mandor/ui';

/**
 * The tab before anything was compared: what it is for and the three steps that fill it. It
 * has no button of its own, because sending is the button of the bar and the key of the panel.
 */
export function ExampleDiffEmpty() {
    const labels = useMessages('requests');

    return (
        <EmptyState
            description={labels('exampleUncheckedHint')}
            icon="compare"
            title={labels('exampleUnchecked')}
        >
            <ol
                className="flex items-center gap-gap-control text-xs text-text-tertiary"
                data-part="example-diff-steps"
            >
                <li className="flex items-center gap-gap-tight">
                    {labels('exampleStepSend')}
                    <kbd className="font-mono text-text-secondary">Ctrl+Enter</kbd>
                </li>
                <li aria-hidden="true">›</li>
                <li>{labels('exampleStepReview')}</li>
                <li aria-hidden="true">›</li>
                <li>{labels('exampleStepAccept')}</li>
            </ol>
        </EmptyState>
    );
}
