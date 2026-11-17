import { useEffect } from 'react';

import { useLanguage } from '@mandor/i18n';

import { bridge } from '../bridge.js';
import { fireAndForget } from '../fire-and-forget.js';

/**
 * Tells main which language the interface is speaking, on mount and on every change. Main
 * cannot read the preference — it lives in the renderer — and its menu is built before the
 * window exists, so the language has to be handed over once the renderer is up.
 */
export function useMenuLanguage(): void {
    const language = useLanguage();

    useEffect(() => {
        fireAndForget(bridge.menu.speak({ language }));
    }, [language]);
}
