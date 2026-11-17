import type { BrowserWindow } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { nativeAsk } from '../../src/window/native-ask.js';

const { showMessageBox } = vi.hoisted(() => ({
    showMessageBox: vi.fn<(window: unknown, options: unknown) => Promise<{ response: number }>>(),
}));

vi.mock('electron', () => ({ dialog: { showMessageBox } }));

const WINDOW = { id: 1 } as BrowserWindow;
const HUNG = {
    buttons: ['wait', 'reload'],
    detail: 'hungDetail',
    title: 'hungTitle',
} as const;

beforeEach(() => {
    showMessageBox.mockReset();
    showMessageBox.mockResolvedValue({ response: 1 });
});

describe('the question the system asks when the window fails', () => {
    it('answers with the button chosen, over the window, in the language of the interface', async () => {
        await expect(nativeAsk(WINDOW, () => 'es')(HUNG)).resolves.toBe(1);

        expect(showMessageBox).toHaveBeenCalledWith(WINDOW, {
            buttons: ['Esperar', 'Recargar'],
            cancelId: 0,
            defaultId: 0,
            detail: 'Puedes esperar a que responda o recargarla. Tu trabajo está guardado.',
            message: 'La ventana no responde',
            noLink: true,
            type: 'warning',
        });
    });

    it('speaks the language it has when it is asked, not the one it had at boot', async () => {
        let language: 'en' | 'es' = 'en';
        const ask = nativeAsk(WINDOW, () => language);

        await ask(HUNG);
        language = 'es';
        await ask(HUNG);

        expect(showMessageBox.mock.calls.map(([, options]) => options)).toMatchObject([
            { message: 'The window is not responding' },
            { message: 'La ventana no responde' },
        ]);
    });
});
