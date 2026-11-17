import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { NAMESPACES } from '../generated/resources.js';

/** Says a key in the language of the window; the key carries its own `namespace:`. */
export type Translator = (key: string, values?: Record<string, number | string>) => string;

/**
 * Returns a translator for keys that are only known when they are drawn, such as the title a
 * feature gave a command. Every namespace is bound, so the key carries its own `namespace:`.
 *
 * The cast is the price of a key that is data: nothing checks it at build time, which is why a
 * key written by hand belongs in `useMessages` instead.
 */
export function useTranslator(): Translator {
    const { t } = useTranslation(NAMESPACES);

    return useCallback<Translator>((key, values) => t(key as never, values ?? {}), [t]);
}
