// isolation-policy: the editor loads once per window, and this file tests that first load.
import { describe, expect, it, vi } from 'vitest';

import {
    loadEditorRuntime,
    loadedEditorRuntime,
    onEditorRuntimeLoaded,
    pendingEditorRuntime,
} from '../../src/editor/editor-runtime.js';
import { signCreatedStyles } from '../../src/lib/style-nonce.js';

const NONCE = 'window-nonce';

// The window declares its nonce, says which language it is read in and signs its styles before
// anything draws, as each app does at its start; the editor writes its styles through that window.
document.documentElement.lang = 'es';
document.head.append(
    Object.assign(document.createElement('meta'), { content: NONCE, name: 'csp-nonce' }),
);
signCreatedStyles();

/** A window whose code type is on its way, and lands when the test says. */
function holdCodeType(): { arrive: () => void; asked: string[]; release: () => void } {
    const fonts = document.fonts;
    const asked: string[] = [];
    let arrive: () => void = () => undefined;
    const arrival = new Promise<FontFace[]>((resolve) => {
        arrive = () => {
            resolve([]);
        };
    });

    Object.assign(document, {
        fonts: {
            load: (font: string) => {
                asked.push(font);

                return arrival;
            },
        },
    });

    return {
        arrive,
        asked,
        release: () => {
            Object.assign(document, { fonts });
        },
    };
}

describe('the editor of the app, loaded on demand', () => {
    /**
     * The editor weighs more than the rest of the window: a window with none never loads it.
     * Monaco measures the code type at the first editor and keeps the reading, so the editor is
     * not loaded until the type is in: measured on the fallback, every caret of the window would
     * stand off the letters it sits between.
     */
    it('loads once, the first time an editor is asked for, once its type is in', async () => {
        const type = holdCodeType();
        const heard = vi.fn();
        const stop = onEditorRuntimeLoaded(heard);

        expect(loadedEditorRuntime()).toBeNull();
        expect(pendingEditorRuntime()).toBeNull();

        const loading = loadEditorRuntime();

        expect(loadEditorRuntime()).toBe(loading);
        expect(pendingEditorRuntime()).toBe(loading);

        // The type is asked for once the editor itself is in, and the editor weighs a lot.
        await vi.waitFor(
            () => {
                expect(type.asked).toEqual([expect.stringContaining('IBM Plex Mono')]);
            },
            { timeout: 20_000 },
        );
        expect(loadedEditorRuntime()).toBeNull();

        type.arrive();
        const runtime = await loading;

        type.release();

        expect(runtime.mountEditor).toBeTypeOf('function');
        expect(runtime.mountDiffEditor).toBeTypeOf('function');
        expect(loadedEditorRuntime()).toBe(runtime);
        expect(heard).toHaveBeenCalledOnce();

        stop();
    });

    /** The editor is read in the language of the window, so its messages load before it does. */
    it('brings the messages of the window language with the editor', async () => {
        await loadEditorRuntime();

        expect((globalThis as { _VSCODE_NLS_LANGUAGE?: string })._VSCODE_NLS_LANGUAGE).toBe('es');
    });

    /**
     * A packaged window runs a style element only when it carries the nonce it was served with.
     * The editor writes its colors the first time one is shown, and writes them through the window.
     */
    it('signs every style the editor writes into the window', async () => {
        const runtime = await loadEditorRuntime();
        const host = document.body.appendChild(document.createElement('div'));
        const target = {
            ariaLabel: 'Payload',
            language: 'jsonc',
            modelKey: 'signed',
            options: {},
            value: '{}',
        } as const;
        const mounted = runtime.mountEditor(host, target, () => undefined);
        const styles = [...document.querySelectorAll('style')];

        expect(styles.length).toBeGreaterThan(0);
        expect(styles.map((style) => style.getAttribute('nonce'))).toEqual(styles.map(() => NONCE));

        mounted.dispose();
    });
});
