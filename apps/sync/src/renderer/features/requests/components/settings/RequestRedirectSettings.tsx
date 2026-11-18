import { useMessages } from '@mandor/i18n';
import type { RequestSettings } from '@mandor/schema';
import {
    NumberInput,
    SettingDependents,
    SettingRow,
    SettingsGroup,
    Switch,
    type SettingsEditing,
} from '@mandor/ui';

type RequestRedirectSettingsProps = {
    editing: SettingsEditing<RequestSettings>;
};

/**
 * Whether a redirect is followed, and the three things that only mean something while it is:
 * how many in a row, whether a 301 or 302 keeps its method, and whether the authorization goes
 * along to another host. They hang from the switch and go away with it.
 */
export function RequestRedirectSettings({ editing }: RequestRedirectSettingsProps) {
    const labels = useMessages('requests');
    const { change, inheritanceOf, values } = editing;

    return (
        <SettingsGroup title={labels('redirectsHeading')}>
            <SettingRow
                help={labels('followRedirectsHelp')}
                inherits={inheritanceOf('followRedirects')}
                label={labels('followRedirects')}
            >
                <Switch
                    checked={values.followRedirects}
                    label={labels('followRedirects')}
                    onCheckedChange={(followRedirects) => {
                        change({ followRedirects });
                    }}
                />
            </SettingRow>
            <RedirectDependents editing={editing} />
        </SettingsGroup>
    );
}

function RedirectDependents({ editing }: RequestRedirectSettingsProps) {
    const labels = useMessages('requests');
    const { change, inheritanceOf, values } = editing;

    if (!values.followRedirects) {
        return null;
    }

    return (
        <SettingDependents>
            <SettingRow
                help={labels('maxRedirectsHelp')}
                inherits={inheritanceOf('maxRedirects')}
                label={labels('maxRedirects')}
            >
                <NumberInput
                    label={labels('maxRedirects')}
                    onNumber={(maxRedirects) => {
                        change({ maxRedirects });
                    }}
                    value={values.maxRedirects}
                />
            </SettingRow>
            <SettingRow
                help={labels('keepMethodOnRedirectHelp')}
                inherits={inheritanceOf('keepMethodOnRedirect')}
                label={labels('keepMethodOnRedirect')}
            >
                <Switch
                    checked={values.keepMethodOnRedirect}
                    label={labels('keepMethodOnRedirect')}
                    onCheckedChange={(keepMethodOnRedirect) => {
                        change({ keepMethodOnRedirect });
                    }}
                />
            </SettingRow>
            <SettingRow
                help={labels('followAuthorizationOnRedirectHelp')}
                inherits={inheritanceOf('followAuthorizationOnRedirect')}
                label={labels('followAuthorizationOnRedirect')}
            >
                <Switch
                    checked={values.followAuthorizationOnRedirect}
                    label={labels('followAuthorizationOnRedirect')}
                    onCheckedChange={(followAuthorizationOnRedirect) => {
                        change({ followAuthorizationOnRedirect });
                    }}
                />
            </SettingRow>
        </SettingDependents>
    );
}
