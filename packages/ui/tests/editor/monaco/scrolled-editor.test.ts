import { editor } from 'monaco-editor/editor/editor.api.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    mountEditor,
    type EditorTarget,
    type MountedEditor,
} from '../../../src/editor/monaco/mount-editor.js';

const JSONC: EditorTarget = {
    ariaLabel: 'Payload',
    language: 'jsonc',
    modelKey: 'k',
    options: {},
    value: '{"a": 1}',
};

const mountedEditors: MountedEditor[] = [];

function mount(target: EditorTarget): { mounted: MountedEditor; shown: editor.ICodeEditor } {
    const host = document.body.appendChild(document.createElement('div'));
    const mounted = mountEditor(host, target, vi.fn());
    const shown = editor.getEditors().find((each) => host.contains(each.getContainerDomNode()));

    if (shown === undefined) {
        throw new Error('nothing mounted');
    }

    mountedEditors.push(mounted);

    return { mounted, shown };
}

afterEach(() => {
    mountedEditors.splice(0).forEach((mounted) => {
        mounted.dispose();
    });
    document.body.replaceChildren();
});

describe('an editor kept level with another view of its text', () => {
    const LINES: EditorTarget = {
        ...JSONC,
        language: 'plaintext',
        value: 'a\nb\nc\nd\ne\nf\ng\nh',
    };

    /** A reader of a text read by windows asks for the next one by how near the end the view is. */
    it('says how much of the text the view shows and where it stands in it', () => {
        const { mounted, shown } = mount({ ...LINES, value: 'line\n'.repeat(200) });

        shown.layout({ height: 100, width: 300 });
        shown.setScrollTop(40);

        const view = mounted.view();

        expect(view.height).toBe(100);
        expect(view.scrollTop).toBe(40);
        expect(view.scrollHeight).toBeGreaterThan(200 * 10);
        expect(view.width).toBeGreaterThan(0);
        expect(view.scrollWidth).toBeGreaterThanOrEqual(view.width);
        expect(view.scrollLeft).toBe(0);
    });

    it('opens on the first line of its text', () => {
        const { mounted } = mount(LINES);

        expect(mounted.topLine()).toBe(1);
    });

    /** Whoever moves the other half has to be told, whichever of the two of them moved it. */
    it('says when the view moved, and stops saying once it is let go', () => {
        const { mounted, shown } = mount(LINES);
        const heard = vi.fn();
        const unwatch = mounted.watchScroll(heard);

        shown.setScrollTop(40);

        expect(heard).toHaveBeenCalled();

        unwatch();
        heard.mockClear();
        shown.setScrollTop(0);

        expect(heard).not.toHaveBeenCalled();
    });

    it('puts a line at the top of the view without asking where the view was', () => {
        const { mounted, shown } = mount(LINES);

        mounted.showLine(4);

        expect(shown.getScrollTop()).toBe(shown.getTopForLineNumber(4));
    });
});
