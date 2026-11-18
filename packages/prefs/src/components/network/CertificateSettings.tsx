import { useTranslator } from '@mandor/i18n';
import type { ClientCertificate } from '@mandor/schema';
import { Button, SettingRow, SettingsGroup } from '@mandor/ui';

import { useNetworkSettings, type NetworkEditing } from '../../network/useNetworkSettings.js';
import { CertificateAuthorities } from './CertificateAuthorities.js';
import { ClientCertificateEntry } from './ClientCertificateEntry.js';

type ClientCertificatesProps = { editing: NetworkEditing };

/** The certificates shown to the hosts that ask for one; the first whose host matches goes. */
function ClientCertificates({ editing }: ClientCertificatesProps) {
    const translate = useTranslator();
    const { settings } = editing.state;
    const write = (clientCertificates: ClientCertificate[]): void => {
        editing.write({ ...settings, clientCertificates });
    };

    return (
        <>
            <SettingsGroup title={translate('preferences:clientCertificates')}>
                <SettingRow
                    help={translate('preferences:clientCertificatesHelp')}
                    label={translate('preferences:clientCertificates')}
                >
                    <Button
                        onClick={() => {
                            const blank = {
                                id: crypto.randomUUID(),
                                host: '',
                                certPath: '',
                                keyPath: '',
                                pfxPath: '',
                            };

                            write([...settings.clientCertificates, blank]);
                        }}
                        variant="secondary"
                    >
                        {translate('preferences:certificateAdd')}
                    </Button>
                </SettingRow>
            </SettingsGroup>
            {settings.clientCertificates.map((certificate) => (
                <ClientCertificateEntry
                    certificate={certificate}
                    editing={editing}
                    key={certificate.id}
                    onChange={(changed) => {
                        write(
                            settings.clientCertificates.map((entry) =>
                                entry.id === changed.id ? changed : entry,
                            ),
                        );
                    }}
                    onRemove={() => {
                        write(
                            settings.clientCertificates.filter(
                                (entry) => entry.id !== certificate.id,
                            ),
                        );
                    }}
                />
            ))}
        </>
    );
}

/**
 * What the requests of both kinds trust and what they show: the authorities beside the bundled
 * ones, and a certificate for each host that asks the client for one.
 */
export function CertificateSettings() {
    const editing = useNetworkSettings();

    if (editing === undefined) {
        return null;
    }

    return (
        <>
            <CertificateAuthorities editing={editing} />
            <ClientCertificates editing={editing} />
        </>
    );
}
