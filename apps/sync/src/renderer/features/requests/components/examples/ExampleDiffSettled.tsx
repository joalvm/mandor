import { useMessages } from '@mandor/i18n';
import { EmptyState } from '@mandor/ui';

/**
 * The tab once the answer and the example agree, or the answer was taken as the example: nothing
 * left to show, and what to do to find out whether it still holds. It has no button of its own,
 * because sending is the button of the bar and the key of the panel.
 */
export function ExampleDiffSettled() {
    const labels = useMessages('requests');

    return (
        <EmptyState
            description={labels('exampleNoDifferencesHint')}
            icon="check"
            title={labels('exampleNoDifferences')}
        >
            <p
                className="flex items-center gap-gap-tight text-xs text-text-tertiary"
                data-part="example-diff-settled-key"
            >
                {labels('exampleStepSend')}
                <kbd className="font-mono text-text-secondary">Ctrl+Enter</kbd>
            </p>
        </EmptyState>
    );
}
