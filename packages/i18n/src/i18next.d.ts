import 'i18next';

import type { DEFAULT_NAMESPACE, EN_RESOURCE } from './generated/resources.js';

declare module 'i18next' {
    interface CustomTypeOptions {
        defaultNS: typeof DEFAULT_NAMESPACE;
        resources: typeof EN_RESOURCE;
    }
}
