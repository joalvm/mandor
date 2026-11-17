import { render } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { DiffTarget } from '../../src/editor/monaco/mount-diff-editor.js';
import { useDiffCodeEditor } from '../../src/hooks/useDiffCodeEditor.js';
import { diffEditorAt } from '../../src/testing/diff-editors-in.js';

const TARGET: DiffTarget = {
    language: 'plaintext',
    modified: 'mine',
    modifiedLabel: 'Mine',
    original: 'theirs',
    originalLabel: 'Incoming',
    readOnly: false,
};

function Holder(props: { onModifiedChange?: (value: string) => void; target: DiffTarget }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useDiffCodeEditor({ containerRef, ...props });

    return <div ref={containerRef} />;
}

describe('the hook that mounts a diff in its container (useDiffCodeEditor)', () => {
    it('mounts the diff once the editor has loaded and shows the texts it is given', async () => {
        render(<Holder target={TARGET} />);

        const shown = await diffEditorAt(0);

        expect(shown.original()).toBe('theirs');
        expect(shown.modified()).toBe('mine');
    });

    it('tells whoever holds it what was typed on the right', async () => {
        const onModifiedChange = vi.fn();

        render(<Holder onModifiedChange={onModifiedChange} target={TARGET} />);
        (await diffEditorAt(0)).typeOver('result');

        expect(onModifiedChange).toHaveBeenLastCalledWith('result');
    });

    it('follows the texts that change outside it', async () => {
        const { rerender } = render(<Holder target={TARGET} />);
        const shown = await diffEditorAt(0);

        rerender(<Holder target={{ ...TARGET, modified: 'other' }} />);

        expect(shown.modified()).toBe('other');
    });

    it('lets the diff go with its container', async () => {
        const { unmount } = render(<Holder target={TARGET} />);

        await diffEditorAt(0);
        unmount();

        await expect(diffEditorAt(0)).rejects.toThrow('no diff is mounted in position 0');
    });
});
