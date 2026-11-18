import { useTranslation } from 'react-i18next';

import { DEFAULT_LANGUAGE, LANGUAGE_CODES, type Language } from '../generated/resources.js';

/**
 * The language the interface is speaking right now. `MessagesProvider` is the one that knows
 * it, and until now it never came back out: the menu of main had no way to ask. What was asked
 * for (`es-ES`, or a tag the app has no texts for) is not what is spoken, so the answer is the
 * language the texts resolved to.
 */
export function useLanguage(): Language {
    const { i18n } = useTranslation();

    return LANGUAGE_CODES.find((code) => code === i18n.resolvedLanguage) ?? DEFAULT_LANGUAGE;
}
