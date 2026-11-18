import type { PreferenceScope } from './preference-scope.js';

export type PreferenceDefinition = {
    defaultValue: string;
    helpKey: string;
    key: string;
    labelKey: string;
    scope: PreferenceScope;
    section: string;
    type: 'select';
    values: readonly string[];
};
