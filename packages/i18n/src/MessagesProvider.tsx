import { I18nextProvider } from 'react-i18next';
import { useMemo, type PropsWithChildren } from 'react';

import { createI18n } from './create-i18n.js';
import { DEFAULT_LANGUAGE } from './generated/resources.js';
import type { MessagePreferences } from './message-preferences.js';

type MessagesProviderProps = PropsWithChildren<{
    preferences: MessagePreferences;
}>;

/** Makes compiled messages follow the current preference, defaulting to English. */
export function MessagesProvider({ children, preferences }: MessagesProviderProps) {
    const language = preferences.language ?? DEFAULT_LANGUAGE;
    const i18n = useMemo(() => createI18n(language), [language]);

    return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
