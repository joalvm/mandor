import type { ResolvedPreferenceValues } from '@mandor/schema';
import { DEFAULT_CODE_PREFERENCES, setCodePreferences } from '@mandor/ui';
import { useLayoutEffect } from 'react';

/**
 * Hands every code editor of the window the way the person set them to write. A layout effect, so
 * an editor restored open, which mounts in an effect of its own, is built that way already; an
 * editor open when the settings change is rewritten in place. The window that unmounts gives back
 * the editors' own defaults.
 */
export function useAppliedCodePreferences(values: ResolvedPreferenceValues): void {
    const autoClose = values['editor.autoClose'] === 'on';
    const fontFamily = values['editor.fontFamily'];
    const fontSize = Number(values['editor.fontSize']);
    const indentSize = Number(values['editor.indentSize']);
    const indentWithTabs = values['editor.indentType'] === 'tabs';
    const wordWrap = values['editor.wordWrap'] === 'on';

    useLayoutEffect(() => {
        setCodePreferences({
            autoClose,
            fontFamily,
            fontSize,
            indentSize,
            indentWithTabs,
            wordWrap,
        });

        return () => {
            setCodePreferences(DEFAULT_CODE_PREFERENCES);
        };
    }, [autoClose, fontFamily, fontSize, indentSize, indentWithTabs, wordWrap]);
}
