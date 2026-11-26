import type { PreferenceDefinition, PreferenceKey } from '@mandor/schema';
import { useTranslator } from '@mandor/i18n';
import { Input, Select, SettingRow, Switch } from '@mandor/ui';
import type { ComponentType } from 'react';

import { preferenceOptionLabel } from '../../lib/preference-option-key.js';

type PreferenceRowProps = {
    /** One of the definitions the schema declares, so its key is one the store knows. */
    definition: PreferenceDefinition & { key: PreferenceKey };
    onValueChange: (key: PreferenceKey, value: string) => void;
    value: string;
};

type ControlProps = PreferenceRowProps & { label: string };

/** The control each kind of preference is set with, at the end of its row. */
const CONTROLS: Record<PreferenceDefinition['type'], ComponentType<ControlProps>> = {
    select: PreferenceSelect,
    switch: PreferenceSwitch,
    text: PreferenceText,
};

/** One preference as a row of the settings: its name and meaning, and the control beside them. */
export function PreferenceRow({ definition, onValueChange, value }: PreferenceRowProps) {
    const translate = useTranslator();
    const label = translate(definition.labelKey);
    const Control = CONTROLS[definition.type];

    return (
        <SettingRow help={translate(definition.helpKey)} label={label}>
            <Control
                definition={definition}
                label={label}
                onValueChange={onValueChange}
                value={value}
            />
        </SettingRow>
    );
}

/** A choice from a list, each option in the words of the window or as an amount of its unit. */
function PreferenceSelect({ definition, label, onValueChange, value }: ControlProps) {
    const translate = useTranslator();
    const values = 'values' in definition ? definition.values : [];

    return (
        <Select
            label={label}
            onValueChange={(next) => {
                onValueChange(definition.key, next);
            }}
            options={values.map((option) => ({
                label: preferenceOptionLabel(definition, option, translate),
                value: option,
            }))}
            value={value}
        />
    );
}

/** On or off, as a switch: a list of two is not a choice worth opening. */
function PreferenceSwitch({ definition, label, onValueChange, value }: ControlProps) {
    return (
        <Switch
            checked={value === 'on'}
            label={label}
            onCheckedChange={(next) => {
                onValueChange(definition.key, next ? 'on' : 'off');
            }}
        />
    );
}

/** A value written by hand, kept as it is typed; empty says the default of the app. */
function PreferenceText({ definition, label, onValueChange, value }: ControlProps) {
    const translate = useTranslator();

    return (
        <Input
            label={label}
            onValueChange={(next) => {
                onValueChange(definition.key, next);
            }}
            placeholder={translate(`${definition.labelKey}Placeholder`)}
            value={value}
        />
    );
}
