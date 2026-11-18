import { AddIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import type { Workspace } from '@mandor/schema';
import { Button, Dialog, DialogBody, DialogFooter, Field, Input } from '@mandor/ui';
import { useState } from 'react';

import { bridge, fireAndForget, useFailureToast } from '@mandor/shell';

type NewWorkspaceDialogProps = {
    /** Called with what main answered, so the panel can offer it and make it the open one. */
    onCreated: (workspace: Workspace) => void;
    onClose: () => void;
};

/**
 * The whole of creating a workspace: one name, asked where nothing else asks to be read. The
 * id never crosses the dialog — main derives it from the name, and the caller keeps working
 * with what came back.
 */
export function NewWorkspaceDialog({ onCreated, onClose }: NewWorkspaceDialogProps) {
    const messages = useMessages('workspace');
    const notifyFailure = useFailureToast();
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);

    const create = (): void => {
        if (busy || name.trim() === '') {
            return;
        }

        setBusy(true);
        fireAndForget(
            bridge.workspace.create({ name }).then((result) => {
                setBusy(false);

                if (!result.ok) {
                    notifyFailure(result.error.code);

                    return;
                }

                onCreated(result.value);
            }),
        );
    };

    return (
        // modal-policy: short-config-form — one name, and nothing else to look at.
        <Dialog
            closeLabel={messages('cancel')}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
            open
            title={messages('newTitle')}
        >
            <DialogBody>
                <Field id="new-workspace-name" label={messages('nameLabel')}>
                    <Input
                        label={messages('nameLabel')}
                        onValueChange={setName}
                        value={name}
                        variant="text"
                    />
                </Field>
            </DialogBody>
            <DialogFooter>
                <Button onClick={onClose} variant="secondary">
                    {messages('cancel')}
                </Button>
                <Button
                    disabled={name.trim() === ''}
                    loading={busy}
                    onClick={create}
                    variant="primary"
                >
                    <AddIcon size="sm" />
                    {messages('createAction')}
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
