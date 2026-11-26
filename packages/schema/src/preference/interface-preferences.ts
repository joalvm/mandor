import { SWITCH_VALUES, type PreferenceDefinition } from './preference-definition.js';

/** How the window treats its tabs, in both apps. */
export const INTERFACE_PREFERENCES = [
    {
        defaultValue: 'on',
        helpKey: 'preferences:askUnsavedHelp',
        key: 'tabs.askUnsaved',
        labelKey: 'preferences:askUnsaved',
        scope: 'app',
        section: 'interface',
        type: 'switch',
        values: SWITCH_VALUES,
    },
    {
        defaultValue: 'off',
        helpKey: 'preferences:alwaysNewTabHelp',
        key: 'tabs.alwaysNew',
        labelKey: 'preferences:alwaysNewTab',
        scope: 'app',
        section: 'interface',
        type: 'switch',
        values: SWITCH_VALUES,
    },
    {
        defaultValue: '20',
        helpKey: 'preferences:closedTabsKeptHelp',
        key: 'tabs.closedKept',
        labelKey: 'preferences:closedTabsKept',
        scope: 'app',
        section: 'interface',
        type: 'select',
        unitKey: 'preferences:unitTabs',
        values: ['10', '20', '50', '100'],
    },
] as const satisfies readonly PreferenceDefinition[];
