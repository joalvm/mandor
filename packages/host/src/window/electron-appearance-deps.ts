import { nativeTheme } from 'electron';

import type { AppearanceHandlerDeps } from './appearance.handlers.js';

/** `registerAppearanceHandlers` over the real app: the scheme the system draws its parts in. */
export function electronAppearanceDeps(): AppearanceHandlerDeps {
    return {
        setSource: (source) => {
            nativeTheme.themeSource = source;
        },
    };
}
