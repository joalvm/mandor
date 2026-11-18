import { createInstance, type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE, DEFAULT_NAMESPACE } from './generated/resources.js';
import { i18nOptions, rethrowInitError } from './i18n-options.js';

/** Creates an isolated, synchronously initialized translator for one renderer tree. */
export function createI18n(language = DEFAULT_LANGUAGE): i18n {
    const instance = createInstance();

    void instance
        .use(initReactI18next)
        .init(i18nOptions(language, DEFAULT_NAMESPACE), rethrowInitError);

    return instance;
}
