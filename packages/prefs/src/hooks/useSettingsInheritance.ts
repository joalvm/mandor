import { useTranslator } from '@mandor/i18n';
import type { SettingsInheritanceWords } from '@mandor/ui';
import { useMemo } from 'react';

import { openSettings } from '../settings-dialog-store.js';

/**
 * What the line under a row says while it follows the defaults that a section of the settings
 * of the app holds: where they are, and the way to them. The settings open over whatever asked,
 * so the row is still there when they close, now reading the default just set.
 */
export function useSettingsInheritance(section: string): SettingsInheritanceWords {
    const translate = useTranslator();

    return useMemo(
        () => ({
            caption: translate('preferences:inheritedFrom'),
            onFollow: () => {
                openSettings(section);
            },
            place: translate('preferences:inheritedPlace'),
            resetLabel: translate('preferences:useDefault'),
        }),
        [section, translate],
    );
}
