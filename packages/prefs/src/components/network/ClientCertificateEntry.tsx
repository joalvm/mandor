import { useTranslator } from '@mandor/i18n';
import type { ClientCertificate } from '@mandor/schema';
import { Button, ConfirmDialog, Input, SettingRow, SettingsGroup } from '@mandor/ui';
import { useState } from 'react';

import type { NetworkEditing } from '../../network/useNetworkSettings.js';
import { FileRow } from './FileRow.js';
import { SecretRow } from './SecretRow.js';

type ClientCertificateEntryProps = {
    certificate: ClientCertificate;
    editing: NetworkEditing;
    onChange: (certificate: ClientCertificate) => void;
    onRemove: () => void;
};

/**
 * One certificate the app shows: to which host, from which files — a PEM pair or one PKCS#12
 * bundle — and the passphrase that opens its key, kept by the keychain. Removing it takes the
 * passphrase with it, which nothing brings back, so it asks first.
 */
export function ClientCertificateEntry({
    certificate,
    editing,
    onChange,
    onRemove,
}: ClientCertificateEntryProps) {
    const translate = useTranslator();
    const [removing, setRemoving] = useState(false);
    const title =
        certificate.host === '' ? translate('preferences:certificateNew') : certificate.host;
    const change = (fields: Partial<ClientCertificate>): void => {
        onChange({ ...certificate, ...fields });
    };

    return (
        <SettingsGroup title={title}>
            <SettingRow
                help={translate('preferences:certificateHostHelp')}
                label={translate('preferences:certificateHost')}
            >
                <Input
                    label={translate('preferences:certificateHost')}
                    onValueChange={(host) => {
                        change({ host: host.trim() });
                    }}
                    placeholder="api.example.com"
                    value={certificate.host}
                />
            </SettingRow>
            <FileRow
                choose={editing.chooseFile}
                label={translate('preferences:certificateCert')}
                onChange={(certPath) => {
                    change({ certPath });
                }}
                path={certificate.certPath}
                purpose="cert"
            />
            <FileRow
                choose={editing.chooseFile}
                label={translate('preferences:certificateKey')}
                onChange={(keyPath) => {
                    change({ keyPath });
                }}
                path={certificate.keyPath}
                purpose="key"
            />
            <FileRow
                choose={editing.chooseFile}
                help={translate('preferences:certificatePfxHelp')}
                label={translate('preferences:certificatePfx')}
                onChange={(pfxPath) => {
                    change({ pfxPath });
                }}
                path={certificate.pfxPath}
                purpose="pfx"
            />
            <SecretRow
                kept={editing.state.kept.passphrases.includes(certificate.id)}
                label={translate('preferences:certificatePassphrase')}
                onKeep={(value) =>
                    editing.setSecret({ kind: 'certificate', id: certificate.id }, value)
                }
            />
            <div className="flex items-center px-pad-control">
                <Button
                    onClick={() => {
                        setRemoving(true);
                    }}
                    variant="ghost"
                >
                    {translate('preferences:certificateRemove')}
                </Button>
            </div>
            {/* modal-policy: irreversible-confirmation — the passphrase leaves the keychain with it. */}
            <ConfirmDialog
                cancelLabel={translate('preferences:cancel')}
                confirmLabel={translate('preferences:certificateRemoveConfirm')}
                description={translate('preferences:certificateRemoveDetail', { name: title })}
                onCancel={() => {
                    setRemoving(false);
                }}
                onConfirm={() => {
                    setRemoving(false);
                    onRemove();
                }}
                onOpenChange={setRemoving}
                open={removing}
                title={translate('preferences:certificateRemoveTitle')}
            />
        </SettingsGroup>
    );
}
