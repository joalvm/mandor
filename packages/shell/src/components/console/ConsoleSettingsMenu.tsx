import { useMessages } from '@mandor/i18n';
import { IconButton, Popover, PopoverPanel, PopoverTrigger, SettingRow, Switch } from '@mandor/ui';
import { useStore } from 'zustand';

import { consoleSettingsStore, setConsoleSettings } from '../../console/console-settings.js';

/**
 * How the console reads, behind the gear of its bar, as Postman keeps the settings of its own:
 * the time of each entry and the requests that went out to the network. What is chosen stays for
 * the next time the window opens.
 */
export function ConsoleSettingsMenu() {
    const messages = useMessages('shell');
    const showTimestamps = useStore(consoleSettingsStore, (state) => state.showTimestamps);
    const showNetwork = useStore(consoleSettingsStore, (state) => state.showNetwork);

    return (
        <Popover>
            <PopoverTrigger>
                <IconButton
                    icon="settings"
                    iconSize="sm"
                    label={messages('consoleSettings')}
                    size="xs"
                />
            </PopoverTrigger>
            <PopoverPanel label={messages('consoleSettings')}>
                <div
                    className="flex flex-col gap-gap-control py-pad-control"
                    data-part="console-settings"
                >
                    <SettingRow label={messages('consoleShowTimestamps')}>
                        <Switch
                            checked={showTimestamps}
                            label={messages('consoleShowTimestamps')}
                            onCheckedChange={(checked) => {
                                setConsoleSettings({ showTimestamps: checked });
                            }}
                        />
                    </SettingRow>
                    <SettingRow label={messages('consoleShowNetwork')}>
                        <Switch
                            checked={showNetwork}
                            label={messages('consoleShowNetwork')}
                            onCheckedChange={(checked) => {
                                setConsoleSettings({ showNetwork: checked });
                            }}
                        />
                    </SettingRow>
                </div>
            </PopoverPanel>
        </Popover>
    );
}
