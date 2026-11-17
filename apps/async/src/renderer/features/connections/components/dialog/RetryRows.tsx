import { useMessages } from '@mandor/i18n';
import {
    NumberInput,
    SettingDependents,
    SettingRow,
    Switch,
    type SettingsEditing,
} from '@mandor/ui';

import type { ResolvedRetry } from '../../lib/connection-settings.js';

type RetryRowsProps = {
    editing: SettingsEditing<ResolvedRetry>;
};

/** The spread is a fraction in the file and a percentage on screen. */
const PERCENT = 100;

/**
 * Whether a connection comes back when the server hangs up, and the policy it comes back by:
 * how many attempts, how the wait grows and how much it is spread. The policy hangs from the
 * switch and goes away with it.
 */
export function RetryRows({ editing }: RetryRowsProps) {
    const messages = useMessages('connections');
    const { change, inheritanceOf, values } = editing;

    return (
        <>
            <SettingRow
                help={messages('retryHelp')}
                inherits={inheritanceOf('enabled')}
                label={messages('retrySetting')}
            >
                <Switch
                    checked={values.enabled}
                    label={messages('retrySetting')}
                    onCheckedChange={(enabled) => {
                        change({ enabled });
                    }}
                />
            </SettingRow>
            <RetryDependents editing={editing} />
        </>
    );
}

function RetryDependents({ editing }: RetryRowsProps) {
    const messages = useMessages('connections');
    const { change, inheritanceOf, values } = editing;

    if (!values.enabled) {
        return null;
    }

    return (
        <SettingDependents>
            <SettingRow inherits={inheritanceOf('attempts')} label={messages('attempts')}>
                <NumberInput
                    label={messages('attempts')}
                    min={1}
                    onNumber={(attempts) => {
                        change({ attempts });
                    }}
                    value={values.attempts}
                />
            </SettingRow>
            <SettingRow
                help={messages('initialWaitHelp')}
                inherits={inheritanceOf('initialWaitMs')}
                label={messages('initialWait')}
            >
                <NumberInput
                    label={messages('initialWait')}
                    min={1}
                    onNumber={(initialWaitMs) => {
                        change({ initialWaitMs });
                    }}
                    unit={messages('unitMs')}
                    value={values.initialWaitMs}
                />
            </SettingRow>
            <SettingRow inherits={inheritanceOf('maximumWaitMs')} label={messages('maximumWait')}>
                <NumberInput
                    label={messages('maximumWait')}
                    min={1}
                    onNumber={(maximumWaitMs) => {
                        change({ maximumWaitMs });
                    }}
                    unit={messages('unitMs')}
                    value={values.maximumWaitMs}
                />
            </SettingRow>
            <SettingRow
                help={messages('spreadHelp')}
                inherits={inheritanceOf('spread')}
                label={messages('spread')}
            >
                <NumberInput
                    label={messages('spread')}
                    onNumber={(percent) => {
                        change({ spread: Math.min(percent, PERCENT) / PERCENT });
                    }}
                    unit={messages('unitPercent')}
                    value={Math.round(values.spread * PERCENT)}
                />
            </SettingRow>
        </SettingDependents>
    );
}
