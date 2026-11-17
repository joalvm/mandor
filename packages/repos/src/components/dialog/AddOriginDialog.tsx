import { useMessages } from '@mandor/i18n';
import { isOriginUrl } from '@mandor/schema';
import { fireAndForget, useFailureToast } from '@mandor/shell';
import { Button, Dialog, DialogBody, DialogFooter, Field, Input, useToast } from '@mandor/ui';
import { useState } from 'react';

import { addOrigin } from '../../lib/add-origin.js';

type AddOriginDialogProps = {
    /** Called after main stored the origin, so the panel can refresh what it shows. */
    onAdded: () => void;
    onClose: () => void;
};

/**
 * Asks for a name and an address, and refuses early what cannot name an origin. Main still
 * asks the address before storing: this check only saves the round trip. Every refusal goes
 * to the toast channel, never to a live region inside the dialog.
 */
export function AddOriginDialog({ onAdded, onClose }: AddOriginDialogProps) {
    const messages = useMessages('origins');
    const notifyFailure = useFailureToast();
    const toast = useToast();
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = (): void => {
        if (!isOriginUrl(url)) {
            toast.notify({ title: messages('invalidUrl'), tone: 'error' });

            return;
        }

        setBusy(true);
        fireAndForget(
            addOrigin({ name, url }).then((result) => {
                setBusy(false);

                if (result.ok) {
                    setName('');
                    setUrl('');
                    onAdded();

                    return;
                }

                notifyFailure(result.error.code);
            }),
        );
    };

    return (
        // modal-policy: short-config-form — two fields, and the check main runs before storing.
        <Dialog
            closeLabel={messages('cancel')}
            onOpenChange={(next) => {
                if (!next) {
                    onClose();
                }
            }}
            open
            title={messages('addTitle')}
        >
            <DialogBody>
                <div className="flex flex-col gap-gap-control" data-part="add-origin-dialog">
                    <Field id="add-origin-name" label={messages('addName')}>
                        <Input
                            label={messages('addName')}
                            onValueChange={setName}
                            value={name}
                            variant="text"
                        />
                    </Field>
                    <Field id="add-origin-address" label={messages('addUrl')}>
                        <Input label={messages('addUrl')} onValueChange={setUrl} value={url} />
                    </Field>
                </div>
            </DialogBody>
            <DialogFooter>
                <Button onClick={onClose} variant="secondary">
                    {messages('cancel')}
                </Button>
                <Button
                    disabled={busy || name.trim() === '' || url.trim() === ''}
                    loading={busy}
                    onClick={submit}
                    variant="primary"
                >
                    {busy ? messages('adding') : messages('addSubmit')}
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
