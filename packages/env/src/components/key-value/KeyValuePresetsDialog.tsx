import { useMessages } from '@mandor/i18n';
import { Button, Dialog, DialogBody, DialogFooter, IconButton } from '@mandor/ui';
import { type ReactNode, useState } from 'react';

import { useKeyValueTable } from './key-value-context.js';
import { KeyValuePresetEditor, type KeyValuePresetDraft } from './KeyValuePresetEditor.js';

/**
 * The dialog that keeps the book of presets: the list with its ways in — edit, delete, add —
 * and, under each of them, the same table every list of pairs is. It edits the book the
 * owner holds; the table outside only takes entries from it. Closed, it draws nothing.
 */
export function KeyValuePresetsDialog(): ReactNode {
    const messages = useMessages('environment');
    const table = useKeyValueTable();
    const presets = table.presets ?? [];
    const [draft, setDraft] = useState<KeyValuePresetDraft | undefined>(undefined);

    function removePreset(id: string): void {
        table.onPresetsChange?.(presets.filter((each) => each.id !== id));
    }

    function saveDraft(next: KeyValuePresetDraft): void {
        const id = next.id ?? crypto.randomUUID();

        table.onPresetsChange?.([
            ...presets.filter((each) => each.id !== id),
            { id, lines: next.lines.filter((line) => line.name !== ''), name: next.name.trim() },
        ]);
        setDraft(undefined);
    }

    if (!table.managing) {
        return null;
    }

    return (
        // modal-policy: short-config-form
        <Dialog
            closeLabel={messages('keyValuePresetsClose')}
            onOpenChange={(open) => {
                if (!open) {
                    table.closePresets();
                }
            }}
            open
            title={messages('keyValuePresetsTitle')}
        >
            <DialogBody>
                <p className="text-sm leading-5 text-text-secondary">
                    {messages('keyValuePresetsHelp')}
                </p>
                <KeyValuePresetBody
                    draft={draft}
                    onDelete={removePreset}
                    onDraftChange={setDraft}
                    onSave={saveDraft}
                />
            </DialogBody>
            <KeyValuePresetsFooter draft={draft} onAdd={setDraft} />
        </Dialog>
    );
}

type PresetDraftProps = { draft: KeyValuePresetDraft | undefined };

function KeyValuePresetBody({
    draft,
    onDelete,
    onDraftChange,
    onSave,
}: PresetDraftProps & {
    onDelete: (id: string) => void;
    onDraftChange: (draft: KeyValuePresetDraft | undefined) => void;
    onSave: (draft: KeyValuePresetDraft) => void;
}) {
    const messages = useMessages('environment');
    const table = useKeyValueTable();
    const presets = table.presets ?? [];

    if (draft !== undefined) {
        return (
            <KeyValuePresetEditor
                draft={draft}
                onCancel={() => {
                    onDraftChange(undefined);
                }}
                onDraftChange={onDraftChange}
                onSave={onSave}
            />
        );
    }

    return (
        <div className="flex flex-col" data-part="key-value-preset-list">
            <PresetsEmpty empty={presets.length === 0} />
            {presets.map((preset) => (
                <div
                    className="flex h-row items-center gap-gap-tight rounded-sm px-pad-control"
                    data-part="key-value-preset-entry"
                    key={preset.id}
                >
                    <span className="min-w-0 flex-1 truncate text-sm">{preset.name}</span>
                    <IconButton
                        icon="edit"
                        label={messages('keyValuePresetsEdit')}
                        onClick={() => {
                            onDraftChange({
                                id: preset.id,
                                lines: [...preset.lines],
                                name: preset.name,
                            });
                        }}
                        size="sm"
                    />
                    <IconButton
                        icon="delete"
                        label={messages('keyValuePresetsDelete')}
                        onClick={() => {
                            onDelete(preset.id);
                        }}
                        size="sm"
                    />
                </div>
            ))}
        </div>
    );
}

function PresetsEmpty({ empty }: { empty: boolean }) {
    const messages = useMessages('environment');

    if (!empty) {
        return null;
    }

    return <p className="text-sm text-text-secondary">{messages('keyValuePresetsEmpty')}</p>;
}

function KeyValuePresetsFooter({
    draft,
    onAdd,
}: PresetDraftProps & { onAdd: (draft: KeyValuePresetDraft) => void }) {
    const messages = useMessages('environment');

    if (draft !== undefined) {
        return null;
    }

    return (
        <DialogFooter>
            <Button
                onClick={() => {
                    onAdd({ id: undefined, lines: [], name: '' });
                }}
                variant="secondary"
            >
                {messages('keyValuePresetsAdd')}
            </Button>
        </DialogFooter>
    );
}
