import { useTranslator } from '@mandor/i18n';
import { bridge, fireAndForget, settlePendingWrites, useFailureToast } from '@mandor/shell';
import { Button, ConfirmDialog, SettingRow } from '@mandor/ui';
import { useState } from 'react';

/**
 * Starts this machine over: every script asks to be approved again before it runs. What still
 * waited for its pause is written first, so main forgets it with the rest instead of receiving it
 * after the forgetting.
 */
export function ForgetApprovalsRow() {
    const translate = useTranslator();
    const notifyFailure = useFailureToast();
    const [asking, setAsking] = useState(false);

    return (
        <SettingRow
            help={translate('preferences:forgetApprovalsHelp')}
            label={translate('preferences:forgetApprovals')}
        >
            <Button
                onClick={() => {
                    setAsking(true);
                }}
            >
                {translate('preferences:forgetApprovalsButton')}
            </Button>
            {/* modal-policy: irreversible-confirmation — no approval comes back once forgotten. */}
            <ConfirmDialog
                cancelLabel={translate('preferences:cancel')}
                confirmLabel={translate('preferences:forgetApprovalsConfirm')}
                description={translate('preferences:forgetApprovalsDetail')}
                onCancel={() => {
                    setAsking(false);
                }}
                onConfirm={() => {
                    setAsking(false);
                    fireAndForget(
                        settlePendingWrites()
                            .then(() => bridge.scripts.forget())
                            .then((result) => {
                                if (!result.ok) {
                                    notifyFailure(result.error.code);
                                }
                            }),
                    );
                }}
                onOpenChange={setAsking}
                open={asking}
                title={translate('preferences:forgetApprovalsTitle')}
            />
        </SettingRow>
    );
}
