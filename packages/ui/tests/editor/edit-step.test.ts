import { editor } from 'monaco-editor/editor/editor.api.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../src/editor/monaco/monaco-setup.js';
import { applyEditStep } from '../../src/editor/edit-step.js';
import { loadEditorRuntime } from '../../src/editor/editor-runtime.js';

const execCommand = vi.fn(() => true);

Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });

afterEach(() => {
    execCommand.mockClear();
    document.body.replaceChildren();
});

describe('a step of the history the window asks for', () => {
    /** Every other field of the window keeps the history the browser holds for it. */
    it('leaves the step to the browser while no editor is loaded', () => {
        applyEditStep('undo');

        expect(execCommand).toHaveBeenCalledWith('undo');
    });

    it('takes the step over the focused editor, and leaves the browser out of it', async () => {
        const runtime = await loadEditorRuntime();
        const host = document.body.appendChild(document.createElement('div'));
        const mounted = runtime.mountEditor(
            host,
            {
                ariaLabel: 'Payload',
                language: 'plaintext',
                modelKey: 'stepped',
                options: {},
                value: 'uno',
            },
            () => undefined,
        );

        editor.getEditors().forEach((each) => {
            each.focus();
        });
        mounted.setValue('dos');
        applyEditStep('undo');

        expect(mounted.getValue()).toBe('uno');
        expect(execCommand).not.toHaveBeenCalled();

        mounted.dispose();
    });

    /** The caret sits in a field of the window, and its history is the browser's. */
    it('leaves the step to the browser while the editor is loaded and unfocused', async () => {
        await loadEditorRuntime();

        applyEditStep('redo');

        expect(execCommand).toHaveBeenCalledWith('redo');
    });
});
