import { useLanguage, useMessages } from '@mandor/i18n';
import type { RequestExample } from '@mandor/schema';
import { IconButton } from '@mandor/ui';

import { formatDuration } from '../../../../response/lib/format-response.js';
import { ResponseStatus } from '../../../../response/ResponseStatus.js';
import type { ExampleComparison } from '../../lib/compare/compare-example.js';

type ExampleDiffBarProps = {
    comparison: ExampleComparison;
    example: RequestExample;
    /** Takes the answer received as the example; without it the band offers no such button. */
    onAccept?: (() => void) | undefined;
    onWrap: (wrap: boolean) => void;
    /** Whether long lines of the diff wrap. */
    wrap: boolean;
};

/** The band over the lines: what came, what was expected of it if that differs, and how it ended. */
export function ExampleDiffBar({
    comparison,
    example,
    onAccept,
    onWrap,
    wrap,
}: ExampleDiffBarProps) {
    const labels = useMessages('requests');
    const language = useLanguage();
    const { received } = comparison;

    return (
        <div
            className="flex h-section shrink-0 items-center gap-gap-control px-pad-panel text-sm"
            data-part="example-diff-bar"
        >
            <span className="text-text-secondary">{labels('exampleReceived')}</span>
            <ResponseStatus status={received.status} statusText={received.statusText} />
            <Expected comparison={comparison} example={example} />
            <span className="tabular-nums text-text-tertiary">
                · {formatDuration(received.timings.totalMs, language)}
            </span>
            <div className="ml-auto flex items-center gap-gap-tight">
                <IconButton
                    active={wrap}
                    icon={wrap ? 'wrap-text' : 'wrap-text-off'}
                    label={labels('wrapLines')}
                    onClick={() => {
                        onWrap(!wrap);
                    }}
                    size="sm"
                />
                <Accept comparison={comparison} onAccept={onAccept} />
            </div>
        </div>
    );
}

function Accept({ comparison, onAccept }: Pick<ExampleDiffBarProps, 'comparison' | 'onAccept'>) {
    const labels = useMessages('requests');

    if (!comparison.valuesDiffer || onAccept === undefined) {
        return null;
    }

    return (
        <IconButton
            className="text-text-accent"
            icon="check"
            label={labels('exampleAccept')}
            onClick={onAccept}
            size="sm"
        />
    );
}

function Expected({ comparison, example }: Pick<ExampleDiffBarProps, 'comparison' | 'example'>) {
    const labels = useMessages('requests');

    if (!comparison.statusDiffers) {
        return null;
    }

    return (
        <span className="text-text-tertiary" data-part="example-diff-expected">
            ({labels('exampleExpected', { status: example.status })})
        </span>
    );
}
