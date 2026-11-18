import { createInstance, type i18n } from 'i18next';

import { DEFAULT_LANGUAGE } from './generated/resources.js';
import { i18nOptions, rethrowInitError } from './i18n-options.js';

/**
 * A translator for the places that are not a renderer tree: the menu of the main process is
 * the one today. Same resources, same keys, no React — the instance is initialized
 * synchronously and ready to answer the moment it is created.
 */
export function createPlainI18n(language = DEFAULT_LANGUAGE): i18n {
    const instance = createInstance();

    void instance.init(i18nOptions(language, 'menu'), rethrowInitError);

    return instance;
}
