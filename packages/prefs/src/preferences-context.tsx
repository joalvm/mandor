import {
    resolvePreferenceValues,
    type PreferenceKey,
    type PreferenceValues,
    type ResolvedPreferenceValues,
} from '@mandor/schema';
import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type PropsWithChildren,
} from 'react';

import { readAppPreferences, writeAppPreferences } from './preferences-storage.js';

type PreferencesContextValue = {
    values: ResolvedPreferenceValues;
    writePreference: (key: PreferenceKey, value: string) => void;
};

type PreferencesProviderProps = PropsWithChildren;

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: PreferencesProviderProps) {
    const [stored, setStored] = useState<PreferenceValues>(readAppPreferences);
    const values = useMemo(() => resolvePreferenceValues({ app: stored }), [stored]);
    const writePreference = useCallback((key: PreferenceKey, value: string) => {
        const next = { ...readAppPreferences(), [key]: value };

        writeAppPreferences(next);
        setStored(next);
    }, []);
    const context = useMemo(() => ({ values, writePreference }), [values, writePreference]);

    return <PreferencesContext.Provider value={context}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
    const preferences = useContext(PreferencesContext);

    if (preferences === null) {
        throw new Error('PreferencesProvider is required');
    }

    return preferences;
}
