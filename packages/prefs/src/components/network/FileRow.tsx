import { useTranslator } from '@mandor/i18n';
import type { NetworkFilePurpose } from '@mandor/ipc';
import { fireAndForget } from '@mandor/shell';
import { Button, IconButton, SettingRow } from '@mandor/ui';

import { fileName } from '../../lib/file-name.js';

type FileRowProps = {
    choose: (purpose: NetworkFilePurpose) => Promise<string | null>;
    help?: string | undefined;
    label: string;
    onChange: (path: string) => void;
    path: string;
    purpose: NetworkFilePurpose;
};

/** One file of a certificate: its name once chosen, the dialog to choose it, and a way out. */
export function FileRow({ choose, help, label, onChange, path, purpose }: FileRowProps) {
    const translate = useTranslator();
    const name = fileName(path);

    return (
        <SettingRow help={help} label={label}>
            <div className="flex min-w-0 items-center gap-gap-control">
                <Button
                    onClick={() => {
                        fireAndForget(
                            choose(purpose).then((picked) => {
                                if (picked !== null) {
                                    onChange(picked);
                                }
                            }),
                        );
                    }}
                    variant="secondary"
                >
                    {path === '' ? translate('preferences:fileChoose') : name}
                </Button>
                <FileClear name={name} onChange={onChange} path={path} />
            </div>
        </SettingRow>
    );
}

function FileClear({
    name,
    onChange,
    path,
}: {
    name: string;
    onChange: FileRowProps['onChange'];
    path: FileRowProps['path'];
}) {
    const translate = useTranslator();

    if (path === '') {
        return null;
    }

    return (
        <IconButton
            icon="close"
            label={translate('preferences:fileClear', { name })}
            onClick={() => {
                onChange('');
            }}
        />
    );
}
