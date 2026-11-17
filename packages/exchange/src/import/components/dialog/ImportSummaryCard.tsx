import { useMessages } from '@mandor/i18n';
import { DocIcon } from '@mandor/icons';
import { Button } from '@mandor/ui';

type ImportSummaryCardProps = {
    name: string;
    onBrowse: () => void;
};

/**
 * The loaded document, in one line: what it calls itself and the way to bring a different one.
 * It replaces the dropzone once a document is read, wearing the same accent tile the dropzone
 * wore, so the document keeps the voice it came in with.
 */
export function ImportSummaryCard({ name, onBrowse }: ImportSummaryCardProps) {
    const messages = useMessages('import');

    return (
        <div
            className="flex h-header items-center gap-gap-control rounded-md border border-border-subtle bg-surface-panel px-pad-panel"
            data-part="import-summary"
        >
            <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-accent-tint text-text-accent"
            >
                <DocIcon size="md" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{name}</span>
            <Button onClick={onBrowse} size="sm" variant="secondary">
                {messages('browse')}
            </Button>
        </div>
    );
}
