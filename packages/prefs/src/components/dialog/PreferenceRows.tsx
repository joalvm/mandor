import { useTranslator } from '@mandor/i18n';
import { PREFERENCE_DEFINITIONS } from '@mandor/schema';
import { SettingsGroup } from '@mandor/ui';
import type { PropsWithChildren } from 'react';

import { usePreferences } from '../../preferences-context.js';
import { PreferenceRow } from './PreferenceRow.js';

type PreferenceRowsProps = PropsWithChildren<{
    section: string;
    /** The message that names the group the rows stand in, apart from the name of the section. */
    titleKey: string;
}>;

/**
 * The preferences of one section of the settings, in the order the definitions give them, under
 * one group. What a section carries beside its preferences goes in as children, inside the group.
 */
export function PreferenceRows({ children, section, titleKey }: PreferenceRowsProps) {
    const preferences = usePreferences();
    const translate = useTranslator();

    return (
        <SettingsGroup title={translate(titleKey)}>
            {PREFERENCE_DEFINITIONS.filter((definition) => definition.section === section).map(
                (definition) => (
                    <PreferenceRow
                        definition={definition}
                        key={definition.key}
                        onValueChange={preferences.writePreference}
                        value={preferences.values[definition.key]}
                    />
                ),
            )}
            {children}
        </SettingsGroup>
    );
}
