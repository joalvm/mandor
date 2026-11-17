import type { PreferenceDefinition, PreferenceKey } from '@mandor/schema';
import { useTranslator } from '@mandor/i18n';
import { Select, SettingRow } from '@mandor/ui';

import { preferenceOptionKey } from '../../lib/preference-option-key.js';

type PreferenceRowProps = {
    /** One of the definitions the schema declares, so its key is one the store knows. */
    definition: PreferenceDefinition & { key: PreferenceKey };
    onValueChange: (key: PreferenceKey, value: string) => void;
    value: string;
};

/** One preference as a row of the settings: its name and meaning, and the choice beside them. */
export function PreferenceRow({ definition, onValueChange, value }: PreferenceRowProps) {
    const translate = useTranslator();
    const label = translate(definition.labelKey);

    return (
        <SettingRow help={translate(definition.helpKey)} label={label}>
            <Select
                label={label}
                onValueChange={(next) => {
                    onValueChange(definition.key, next);
                }}
                options={definition.values.map((option) => ({
                    label: translate(preferenceOptionKey(definition, option)),
                    value: option,
                }))}
                value={value}
            />
        </SettingRow>
    );
}
