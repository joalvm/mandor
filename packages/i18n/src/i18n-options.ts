import type { InitOptions } from 'i18next';

import { DEFAULT_LANGUAGE, LANGUAGE_CODES, NAMESPACES, RESOURCES } from './generated/resources.js';

/**
 * What every translator of the app starts from: the same resources and the same keys, answering
 * synchronously the moment it is created. Only the language and the namespace a bare key falls
 * in change from one place to another.
 */
export function i18nOptions(language: string, defaultNS: string): InitOptions {
    return {
        defaultNS,
        fallbackLng: DEFAULT_LANGUAGE,
        initAsync: false,
        interpolation: { escapeValue: false },
        lng: language,
        nonExplicitSupportedLngs: true,
        ns: [...NAMESPACES],
        resources: RESOURCES,
        supportedLngs: [...LANGUAGE_CODES],
    };
}

/** A translator that failed to start is a build that is broken, so it fails where it is made. */
export function rethrowInitError(error: Error | null | undefined): void {
    if (error !== undefined && error !== null) {
        throw error;
    }
}
