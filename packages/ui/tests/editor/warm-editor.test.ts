// isolation-policy: the editor loads once per window, and this file tests that first load.
import { editor } from 'monaco-editor/editor/editor.api.js';
import { describe, expect, it, vi } from 'vitest';

import { pendingEditorRuntime } from '../../src/editor/editor-runtime.js';
import { warmEditorWhenIdle } from '../../src/editor/warm-editor.js';

type IdleWork = () => void;

const idle: IdleWork[] = [];
const built: string[] = [];

// jsdom has no idle time: the moments the window has nothing to do are the test's to hand out.
vi.stubGlobal('requestIdleCallback', (work: IdleWork) => idle.push(work));
editor.onDidCreateEditor((created) => built.push(created.getId()));

function idleOnce(): void {
    idle.splice(0).forEach((work) => {
        work();
    });
}

describe('warming the editor while the window is idle', () => {
    /**
     * The first editor of a window pays for loading, building and measuring what every later one
     * shares. The window pays it once, out of sight, the first moment it has nothing else to do,
     * and the first document the user opens does not wait for it.
     */
    it('builds one editor nobody sees once the window is idle, and lets it go', async () => {
        warmEditorWhenIdle();

        expect(pendingEditorRuntime()).toBeNull();

        idleOnce();
        await pendingEditorRuntime();
        await vi.waitFor(() => {
            expect(built).toHaveLength(1);
        });
        expect(editor.getEditors()).toEqual([]);
        expect(editor.getModels()).toEqual([]);
    });
});
