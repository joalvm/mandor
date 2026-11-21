import { useMessages } from '@mandor/i18n';
import { fireAndForget, useCopyText } from '@mandor/shell';
import { Button, Dialog, DialogBody, DialogFooter } from '@mandor/ui';
import { useState } from 'react';

import { useCookieJar } from '../../hooks/useCookieJar.js';
import { CookieJarTable } from '../table/CookieJarTable.js';
import { CookieClearDialog } from './CookieClearDialog.js';

type CookieJarDialogProps = {
    environmentId: string | null;
    onClose: () => void;
    workspaceId: string;
};

/**
 * The jar of one environment: what the servers set, as a table. A value can be copied or changed
 * in place, a cookie deleted, the whole jar emptied after a question.
 */
export function CookieJarDialog({ environmentId, onClose, workspaceId }: CookieJarDialogProps) {
    const labels = useMessages('cookies');
    const jar = useCookieJar({ environmentId, workspaceId });
    const [clearing, setClearing] = useState(false);
    const cookies = jar.cookies ?? [];

    return (
        <div data-part="cookie-jar-dialog">
            {/* modal-policy: short-config-form */}
            <Dialog
                closeLabel={labels('close')}
                onOpenChange={(open) => {
                    if (!open) {
                        onClose();
                    }
                }}
                open
                title={labels('title')}
            >
                <DialogBody>
                    <JarBody jar={jar} />
                </DialogBody>
                <DialogFooter>
                    <Button
                        disabled={cookies.length === 0}
                        onClick={() => {
                            setClearing(true);
                        }}
                        size="md"
                        variant="secondary"
                    >
                        {labels('clear')}
                    </Button>
                </DialogFooter>
            </Dialog>
            <CookieClearDialog
                onCancel={() => {
                    setClearing(false);
                }}
                onConfirm={() => {
                    setClearing(false);
                    fireAndForget(jar.clear());
                }}
                open={clearing}
            />
        </div>
    );
}

function JarBody({ jar }: { jar: ReturnType<typeof useCookieJar> }) {
    const labels = useMessages('cookies');
    const copy = useCopyText();

    if (jar.cookies === null) {
        return null;
    }

    if (jar.cookies.length === 0) {
        return (
            <p className="text-text-secondary" data-part="cookie-jar-empty">
                <span className="text-text-primary">{labels('emptyTitle')}</span>
                <span> · {labels('emptyBody')}</span>
            </p>
        );
    }

    return (
        <CookieJarTable
            cookies={jar.cookies}
            onCopy={copy}
            onDelete={(row) => {
                fireAndForget(jar.remove(row));
            }}
            onSave={(row, value) => {
                fireAndForget(jar.save(row, value));
            }}
        />
    );
}
