import { registerSurface } from '@mandor/shell';

import { openSettings } from './settings-dialog-store.js';

/**
 * Hangs the settings of the app on the surface the window opens them by — the button of the
 * title bar, the palette — so whoever asks for them opens the dialog, wherever they stand.
 */
export function registerSettingsSurface(): () => void {
    return registerSurface({
        id: 'settings',
        open: () => {
            openSettings();
        },
    });
}
