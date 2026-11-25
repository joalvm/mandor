import type { PreferenceDefinition } from './preference-definition.js';

/**
 * How much of the past each app keeps: the sends of Mandor Request and the activity of the
 * connections of Mandor Realtime. Each app shows only the section it has.
 */
export const RETENTION_PREFERENCES = [
    {
        defaultValue: '500',
        helpKey: 'preferences:historyEntriesHelp',
        key: 'history.maxEntries',
        labelKey: 'preferences:historyEntries',
        scope: 'app',
        section: 'history',
        type: 'select',
        unitKey: 'preferences:unitSends',
        values: ['100', '500', '1000', '5000'],
    },
    {
        defaultValue: '30',
        helpKey: 'preferences:historyDaysHelp',
        key: 'history.maxAgeDays',
        labelKey: 'preferences:historyDays',
        scope: 'app',
        section: 'history',
        type: 'select',
        unitKey: 'preferences:unitDays',
        values: ['7', '30', '90', '365'],
    },
    {
        defaultValue: '500',
        helpKey: 'preferences:activityEntriesHelp',
        key: 'activity.maxEntries',
        labelKey: 'preferences:activityEntries',
        scope: 'app',
        section: 'activity',
        type: 'select',
        unitKey: 'preferences:unitEntries',
        values: ['200', '500', '1000', '2000'],
    },
] as const satisfies readonly PreferenceDefinition[];
