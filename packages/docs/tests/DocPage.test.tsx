import { setTextZoom } from '@mandor/ui';
import { byPart } from '@mandor/ui/testing';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DocPage } from '../src/components/view/DocPage.js';

import { AppProviders } from './support/app-providers.js';

const DOC = '# Guía\n\nEl endpoint responde en JSON.\n';

afterEach(() => {
    cleanup();
    setTextZoom(0);
});

describe('the doc as a page that scrolls', () => {
    it('draws the markdown inside the one box that scrolls', () => {
        const { container } = render(<DocPage value={DOC} />, { wrapper: AppProviders });
        const page = byPart('doc-page', container);

        expect(screen.getByRole('heading', { level: 1, name: 'Guía' })).toBeVisible();
        expect(page.className).toContain('overflow-y-auto');
    });

    /** Whoever keeps another view level with this one has to be able to reach its box. */
    it('hands its box to the caller that asked for it, and says when it moves', () => {
        const pageRef = createRef<HTMLDivElement>();
        const onScroll = vi.fn();
        const { container } = render(
            <DocPage onScroll={onScroll} pageRef={pageRef} value={DOC} />,
            { wrapper: AppProviders },
        );

        expect(pageRef.current).toBe(byPart('doc-page', container));

        fireEvent.scroll(byPart('doc-page', container));

        expect(onScroll).toHaveBeenCalled();
    });

    /** Anywhere over the page, its margins too: the column of text is narrower than the box. */
    it('lets the reader resize its text with the wheel over the box, and bring it back', () => {
        const { container } = render(<DocPage value={DOC} />, { wrapper: AppProviders });
        const page = byPart('doc-page', container);

        fireEvent.wheel(page, { ctrlKey: true, deltaY: -100 });
        fireEvent.wheel(page, { ctrlKey: true, deltaY: -100 });

        expect(byPart('markdown', container)).toHaveAttribute('data-text-zoom', '2');

        fireEvent.keyDown(page, { code: 'Digit0', ctrlKey: true, key: '0' });

        expect(byPart('markdown', container)).toHaveAttribute('data-text-zoom', '0');
    });

    it('resizes from over the box it handed to its caller too', () => {
        const pageRef = createRef<HTMLDivElement>();
        const { container } = render(<DocPage pageRef={pageRef} value={DOC} />, {
            wrapper: AppProviders,
        });

        fireEvent.wheel(byPart('doc-page', container), { ctrlKey: true, deltaY: -100 });

        expect(byPart('markdown', container)).toHaveAttribute('data-text-zoom', '1');
    });
});
