import { useTranslation } from 'react-i18next';

import type { MessageNamespace } from '../generated/resources.js';

/** Returns the i18next translator bound to one discovered namespace. */
export function useMessages<Namespace extends MessageNamespace>(namespace: Namespace) {
    const { t } = useTranslation(namespace);

    return t;
}
