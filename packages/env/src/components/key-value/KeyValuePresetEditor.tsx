import { useMessages } from '@mandor/i18n';
import { Button, Input } from '@mandor/ui';
import { type ReactNode, useState } from 'react';

import type { KeyValueColumns, KeyValueLine } from './key-value-line.js';
import { PlainKeyValueTable } from './PlainKeyValueTable.js';

/** What the editor holds while it is being written: the name and the lines, not yet a book entry. */
export type KeyValuePresetDraft = {
    /** Undefined while the preset has no name to keep — the book finds entries by it. */
    id: string | undefined;
    lines: readonly KeyValueLine[];
    name: string;
};

type KeyValuePresetEditorProps = {
    draft: KeyValuePresetDraft;
    onDraftChange: (draft: KeyValuePresetDraft) => void;
    onCancel: () => void;
    onSave: (draft: KeyValuePresetDraft) => void;
};

const EDITOR_COLUMNS: KeyValueColumns = { description: false, value: true };

/**
 * One preset being written: its name and its rows, in the same table every list of pairs
 * is. The table inside knows nothing of the book — it edits lines, the book keeps names.
 */
export function KeyValuePresetEditor({
    draft,
    onDraftChange,
    onCancel,
    onSave,
}: KeyValuePresetEditorProps): ReactNode {
    const messages = useMessages('environment');
    const [columns, setColumns] = useState<KeyValueColumns>(EDITOR_COLUMNS);

    return (
        <div className="flex min-h-0 flex-col gap-gap-control" data-part="key-value-preset-editor">
            <Input
                label={messages('keyValuePresetName')}
                onValueChange={(name) => {
                    onDraftChange({ ...draft, name });
                }}
                placeholder={messages('keyValuePresetName')}
                value={draft.name}
                variant="text"
            />
            <PlainKeyValueTable
                columns={columns}
                environment={undefined}
                lines={draft.lines}
                onColumnsChange={setColumns}
                onLinesChange={(lines) => {
                    onDraftChange({ ...draft, lines });
                }}
                onVariablesChange={() => undefined}
                title={messages('keyValuePresetRows')}
                typed={false}
            />
            <div className="flex items-center justify-end gap-gap-tight">
                <Button onClick={onCancel} size="sm" variant="secondary">
                    {messages('keyValueCancel')}
                </Button>
                <Button
                    disabled={draft.name.trim() === ''}
                    onClick={() => {
                        onSave(draft);
                    }}
                    size="sm"
                    variant="primary"
                >
                    {messages('keyValueSave')}
                </Button>
            </div>
        </div>
    );
}
