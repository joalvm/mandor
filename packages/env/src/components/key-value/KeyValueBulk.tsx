import { useMessages } from '@mandor/i18n';
import { Textarea } from '@mandor/ui';
import type { ReactNode } from 'react';

type KeyValueBulkProps = {
    draft: string;
    onDraftChange: (draft: string) => void;
};

/**
 * The table said in one column: one `key:value` per line, the disabled pairs commented with
 * `//`. It is the same lines, not another dialect — the note under the text says so, and the
 * button in the toolbar returns to the rows with what the text holds.
 */
export function KeyValueBulk({ draft, onDraftChange }: KeyValueBulkProps): ReactNode {
    const messages = useMessages('environment');

    return (
        <div className="flex min-h-0 flex-1 flex-col" data-part="key-value-bulk">
            <Textarea
                className="min-h-72 flex-1 rounded-none border-0 border-b border-border-subtle"
                label={messages('keyValueBulkLabel')}
                mono
                onValueChange={onDraftChange}
                value={draft}
            />
            <p className="px-pad-control py-gap-tight text-2xs text-text-secondary">
                {messages('keyValueBulkHelp')}
            </p>
        </div>
    );
}
