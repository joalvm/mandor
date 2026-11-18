import { createPlainI18n, DEFAULT_LANGUAGE } from '@mandor/i18n';
import { app, dialog } from 'electron';

/**
 * What is left when the app cannot come up. No window opened, so nothing else would ever say so,
 * and the process would stay alive holding the lock of the single instance: every later start
 * would hand over to it and vanish. The dialog of the system says why, in the provisional language
 * of the menu, and the process ends.
 */
export function failToStart(error: unknown): void {
    const t = createPlainI18n(DEFAULT_LANGUAGE).t;
    const cause = error instanceof Error ? error.message : String(error);

    dialog.showErrorBox(t('faults:startFailedTitle'), t('faults:startFailedDetail', { cause }));
    app.exit(1);
}
