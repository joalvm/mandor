// isolation-policy: the renderer of markdown loads once per window, and this file tests that first load.
import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { Markdown } from '../../src/components/markdown/Markdown.js';
import {
    loadedMarkdownRuntime,
    loadMarkdownRuntime,
} from '../../src/components/markdown/markdown-runtime.js';
import { useMarkdownRuntime } from '../../src/hooks/useMarkdownRuntime.js';

function Harness(): ReactNode {
    return <p>{useMarkdownRuntime() === null ? 'loading' : 'ready'}</p>;
}

describe('useMarkdownRuntime', () => {
    /** The window opens without the renderer, and the first text drawn loads it. */
    it('loads the renderer for the component that asks, and draws it again once it is there', async () => {
        expect(loadedMarkdownRuntime()).toBeNull();

        render(<Harness />);

        expect(screen.getByText('loading')).toBeInTheDocument();

        await act(async () => {
            await loadMarkdownRuntime();
        });

        expect(screen.getByText('ready')).toBeInTheDocument();
        expect(loadedMarkdownRuntime()?.MarkdownTree).toBeTypeOf('function');
    });

    it('draws the text in the first render once the renderer is there', () => {
        render(<Markdown value="# Notas" />);

        expect(screen.getByRole('heading', { name: 'Notas' })).toBeVisible();
    });
});
