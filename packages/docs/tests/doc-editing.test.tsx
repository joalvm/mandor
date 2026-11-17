import { ROOT_GROUP_ID, success } from '@mandor/ipc';
import { bridge, shellStore, tabKindOf } from '@mandor/shell';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DrawnTabPart, translatorIn } from '@mandor/shell/testing/tab-kind';

import { DocPreviewTabKind, DocTabKind } from '../src/index.js';
import { docsStore } from '../src/docs-store.js';

import { AppProviders } from './support/app-providers.js';

const README = 'mandor://local-apis/events/doc/readme.md';
const TEXT = '# Readme\n';

/** Longer than the pause the writer waits for, so the timer has certainly gone off. */
const AFTER_THE_PAUSE = 2000;

let unregister: (() => void)[] = [];

function renderDoc(): { unmount: () => void } {
    const shown = render(<DrawnTabPart kind="doc" resource={README} tabId="doc-1" />, {
        wrapper: AppProviders,
    });

    write();

    return shown;
}

/** A doc with something in it opens as a page, so writing in one starts by asking to write. */
function write(): void {
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
}

async function type(text: string): Promise<void> {
    (await editorAt(0)).typeOver(text);
}

beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    docsStore.getState().reset();
    docsStore.getState().setText(README, TEXT);
    unregister = [render(<DocTabKind />).unmount, render(<DocPreviewTabKind />).unmount];
});

afterEach(() => {
    for (const each of unregister) {
        each();
    }

    vi.useRealTimers();
});

describe('writing in a doc', () => {
    it('keeps the tab that was only open to look at the doc', async () => {
        vi.spyOn(bridge.doc, 'write').mockResolvedValue(success({}));
        shellStore
            .getState()
            .openTab(
                ROOT_GROUP_ID,
                { id: 'doc-1', kind: 'doc', resource: README },
                { preview: true },
            );

        renderDoc();
        await type('# Readme, leído y escrito\n');

        expect(JSON.stringify(shellStore.getState().grid)).not.toContain('preview');

        shellStore.getState().reset();
    });

    /** There is no saving in this app: the pause in the typing is what puts the file on disk. */
    it('writes the file once the typing stops', async () => {
        const write = vi.spyOn(bridge.doc, 'write').mockResolvedValue(success({}));

        renderDoc();
        await type('# Readme\n\nY una línea más.\n');

        expect(write).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(AFTER_THE_PAUSE);

        expect(write).toHaveBeenCalledWith({
            name: 'readme.md',
            text: '# Readme\n\nY una línea más.\n',
            workspaceId: 'events',
        });
    });

    it('writes a sentence once and not once per letter', async () => {
        const write = vi.spyOn(bridge.doc, 'write').mockResolvedValue(success({}));

        renderDoc();
        await type('# R');
        await type('# Re');
        await type('# Readme de verdad');

        await vi.advanceTimersByTimeAsync(AFTER_THE_PAUSE);

        expect(write).toHaveBeenCalledOnce();
        expect(write).toHaveBeenCalledWith(expect.objectContaining({ text: '# Readme de verdad' }));
    });

    /** Closing asks nothing, so closing cannot be the moment the last sentence is lost. */
    it('keeps the write of a tab that closed right after the change', async () => {
        const write = vi.spyOn(bridge.doc, 'write').mockResolvedValue(success({}));
        const { unmount } = renderDoc();

        await type('Lo último que escribí');
        unmount();

        await vi.advanceTimersByTimeAsync(AFTER_THE_PAUSE);

        expect(screen.queryByRole('dialog')).toBeNull();
        expect(write).toHaveBeenCalledWith(
            expect.objectContaining({ text: 'Lo último que escribí' }),
        );
    });

    /** The preview is another tab of the same resource, so it reads the text and not the disk. */
    it('shows in the preview what has not reached disk yet', async () => {
        vi.spyOn(bridge.doc, 'write').mockResolvedValue(success({}));

        render(
            <>
                <DrawnTabPart kind="doc" resource={README} tabId="doc-1" />
                <DrawnTabPart kind="doc-preview" resource={README} tabId="doc-preview-1" />
            </>,
            { wrapper: AppProviders },
        );
        write();
        await type('# Otro título\n');

        expect(screen.getByRole('heading', { level: 1, name: 'Otro título' })).toBeVisible();
    });

    it('names the preview after the title of the doc it is showing', () => {
        docsStore.getState().setDocs([{ name: 'readme.md', title: 'readme' }]);

        expect(tabKindOf('doc-preview').title(README, translatorIn())).toBe('readme (preview)');
    });
});
