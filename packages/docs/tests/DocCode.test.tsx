import { allByPart, byPart } from '@mandor/ui/testing';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DocView } from '../src/index.js';

import { AppProviders } from './support/app-providers.js';

const FENCE = ['```ts', 'const port = 8080;', '```', ''].join('\n');
const writeText = vi.fn<(text: string) => Promise<void>>();

function show(value: string) {
    return render(<DocView value={value} />, { wrapper: AppProviders }).container;
}

beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
});

afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, 'clipboard');
});

/** A fenced block of a doc (DocPre), shown as code (DocCode) with its copy button (DocCopy). */
describe('a block of code of a doc', () => {
    it('names the language its fence names', () => {
        expect(byPart('doc-code-language', show(FENCE))).toHaveTextContent('ts');
    });

    it('names no language for a fence that names none, and still copies', () => {
        const container = show('```\ntexto pegado\n```\n');

        expect(allByPart('doc-code-language', container)).toHaveLength(0);
        expect(screen.getByRole('button', { name: 'Copy code' })).toBeVisible();
    });

    /** What is pasted is what was written, without the line break the fence leaves behind. */
    it('copies the code as it was written', async () => {
        show(FENCE);

        fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));

        expect(writeText).toHaveBeenCalledWith('const port = 8080;');
        expect(await screen.findByRole('button', { name: 'Copied' })).toBeVisible();
    });

    /** The tick is a moment, not a state: the button goes back to saying what it does. */
    it('goes back to its own name a moment after the copy', async () => {
        vi.useFakeTimers();
        show(FENCE);

        fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
        await act(async () => {
            await Promise.resolve();
        });

        expect(screen.getByRole('button', { name: 'Copied' })).toBeVisible();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1500);
        });

        expect(screen.getByRole('button', { name: 'Copy code' })).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Copied' })).toBeNull();
    });

    it('keeps its line of the doc, for the page that follows the editor', () => {
        const container = show(`Antes.\n\n${FENCE}`);

        expect(byPart('doc-code-block', container)).toHaveAttribute('data-line', '3');
    });
});
