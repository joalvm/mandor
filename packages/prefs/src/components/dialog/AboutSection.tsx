import { useTranslator } from '@mandor/i18n';
import type { AppAbout } from '@mandor/ipc';
import { bridge, fireAndForget } from '@mandor/shell';
import { Button, SettingRow, SettingsGroup } from '@mandor/ui';
import { useEffect, useState } from 'react';

import { aboutReport } from '../../lib/about-report.js';

/** How long the button says it copied: long enough to be read, not so long it is in the way. */
const COPIED_MS = 1500;

/**
 * Which app this is, what version runs and what it runs on, with the way to put all of it in a
 * report of a fault. The licenses are opened by main, which is the one that knows where the
 * install keeps them: the window asks for them and names no path.
 */
export function AboutSection() {
    const translate = useTranslator();
    const [about, setAbout] = useState<AppAbout | undefined>();
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let live = true;

        fireAndForget(
            bridge.app.about().then((result) => {
                if (live && result.ok) {
                    setAbout(result.value);
                }
            }),
        );

        return () => {
            live = false;
        };
    }, []);

    useEffect(() => {
        if (!copied) {
            return undefined;
        }

        const timer = setTimeout(() => {
            setCopied(false);
        }, COPIED_MS);

        return () => {
            clearTimeout(timer);
        };
    }, [copied]);

    if (about === undefined) {
        return null;
    }

    return (
        <SettingsGroup title={about.name}>
            <SettingRow
                help={translate('preferences:aboutRuntimes', {
                    chrome: about.chrome,
                    electron: about.electron,
                    node: about.node,
                })}
                label={translate('preferences:aboutVersion', { version: about.version })}
            >
                <Button
                    onClick={() => {
                        fireAndForget(
                            navigator.clipboard.writeText(aboutReport(about)).then(() => {
                                setCopied(true);
                            }),
                        );
                    }}
                    size="sm"
                >
                    {translate(copied ? 'preferences:aboutCopied' : 'preferences:aboutCopy')}
                </Button>
            </SettingRow>
            <SettingRow
                help={translate('preferences:aboutLicensesHelp')}
                label={translate('preferences:aboutLicenses')}
            >
                <Button
                    onClick={() => {
                        fireAndForget(bridge.app.openLicenses());
                    }}
                    size="sm"
                    variant="link"
                >
                    {translate('preferences:aboutLicensesOpen')}
                </Button>
            </SettingRow>
        </SettingsGroup>
    );
}
