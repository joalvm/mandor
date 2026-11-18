import { useTranslator } from '@mandor/i18n';
import { fireAndForget } from '@mandor/shell';
import { Button, IconButton, SettingRow, SettingsGroup } from '@mandor/ui';

import { fileName } from '../../lib/file-name.js';
import type { NetworkEditing } from '../../network/useNetworkSettings.js';

type CertificateAuthoritiesProps = { editing: NetworkEditing };

/**
 * The authorities trusted beside the ones Mandor ships with: the root of a company, or of a
 * server on this machine that signs its own certificate. Adding one never drops the others.
 */
export function CertificateAuthorities({ editing }: CertificateAuthoritiesProps) {
    const translate = useTranslator();
    const { settings } = editing.state;
    const write = (caPaths: string[]): void => {
        editing.write({ ...settings, caPaths });
    };

    return (
        <SettingsGroup title={translate('preferences:caFiles')}>
            <SettingRow
                help={translate('preferences:caFilesHelp')}
                label={translate('preferences:caFiles')}
                stacked
            >
                <ul
                    aria-label={translate('preferences:caFiles')}
                    className="flex min-w-0 flex-col gap-gap-tight"
                >
                    {settings.caPaths.map((path) => (
                        <li
                            className="flex min-w-0 items-center justify-between gap-gap-control"
                            key={path}
                        >
                            <span className="truncate text-sm text-text-primary">
                                {fileName(path)}
                            </span>
                            <IconButton
                                icon="delete"
                                label={translate('preferences:fileRemove', {
                                    name: fileName(path),
                                })}
                                onClick={() => {
                                    write(settings.caPaths.filter((kept) => kept !== path));
                                }}
                            />
                        </li>
                    ))}
                </ul>
                <Button
                    onClick={() => {
                        fireAndForget(
                            editing.chooseFile('ca').then((picked) => {
                                if (picked !== null && !settings.caPaths.includes(picked)) {
                                    write([...settings.caPaths, picked]);
                                }
                            }),
                        );
                    }}
                    variant="secondary"
                >
                    {translate('preferences:caAdd')}
                </Button>
            </SettingRow>
        </SettingsGroup>
    );
}
