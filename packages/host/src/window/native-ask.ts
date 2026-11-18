import { createPlainI18n, type Language } from '@mandor/i18n';
import { dialog, type BrowserWindow } from 'electron';

import type { FaultQuestion } from './window-faults.js';

/**
 * Asks the person with the dialog of the system, in the language the interface speaks now. The
 * dialog is the system's and not the window's on purpose: it is what is left to talk with when
 * the window is the thing that failed. Closing it without choosing is the first button, which is
 * always the one that does the least.
 */
export function nativeAsk(
    window: BrowserWindow,
    language: () => Language,
): (question: FaultQuestion) => Promise<number> {
    return async (question) => {
        const t = createPlainI18n(language()).t;
        const { response } = await dialog.showMessageBox(window, {
            buttons: question.buttons.map((button) => t(`faults:${button}`)),
            cancelId: 0,
            defaultId: 0,
            detail: t(`faults:${question.detail}`),
            message: t(`faults:${question.title}`),
            noLink: true,
            type: 'warning',
        });

        return response;
    };
}
