import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useNameSelected } from '../src/components/dialog/useNameSelected.js';

/** A name field as the dialog draws it: editable text, in the document. */
function fieldWith(name: string): HTMLElement {
    const field = document.createElement('span');

    field.contentEditable = 'true';
    field.tabIndex = 0;
    field.textContent = name;
    document.body.append(field);

    return field;
}

function selectedText(): string {
    return window.getSelection()?.toString() ?? '';
}

afterEach(() => {
    cleanup();
    window.getSelection()?.removeAllRanges();
    document.body.replaceChildren();
});

describe('useNameSelected', () => {
    it('selects the whole name of a field that already holds the focus', () => {
        const field = fieldWith('New workspace');

        field.focus();
        renderHook(() => {
            useNameSelected({ current: field });
        });

        expect(selectedText()).toBe('New workspace');
    });

    it('selects the whole name the first time the field takes the focus, and only then', () => {
        const field = fieldWith('New workspace');
        const other = fieldWith('other');

        renderHook(() => {
            useNameSelected({ current: field });
        });

        expect(selectedText()).toBe('');

        other.focus();

        expect(selectedText()).toBe('');

        field.focus();

        expect(selectedText()).toBe('New workspace');

        window.getSelection()?.removeAllRanges();
        other.focus();
        field.focus();

        expect(selectedText()).toBe('');
    });
});
