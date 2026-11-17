import { editorAt } from '@mandor/ui/testing/editors-in';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DocWriteSplit } from '../src/components/surface/DocWriteSplit.js';

import { AppProviders } from './support/app-providers.js';

const DOC = '# Guía\n\n- [ ] Probar\n';
const KEY = 'mandor://local-apis/events/doc/guia.md';

function split(direction: 'column' | 'row') {
    const onChange = vi.fn();

    render(
        <DocWriteSplit
            direction={direction}
            doc={{ label: 'Doc editor', modelKey: KEY, onChange, place: KEY, value: DOC }}
        />,
        { wrapper: AppProviders },
    );

    return onChange;
}

describe('the markdown with its page beside it', () => {
    it('stands the two halves side by side, with a line between them to drag', async () => {
        split('row');

        expect(await editorAt(0)).toBeDefined();
        expect(screen.getByRole('separator', { name: 'Editor width' })).toHaveAttribute(
            'aria-orientation',
            'vertical',
        );
    });

    /** A panel too narrow for two columns of text puts the page under the markdown. */
    it('puts the page under the markdown when it is told to', () => {
        split('column');

        expect(screen.getByRole('separator', { name: 'Editor width' })).toHaveAttribute(
            'aria-orientation',
            'horizontal',
        );
    });

    it('writes the markdown when a box of the page is ticked', () => {
        const onChange = split('row');

        fireEvent.click(screen.getByRole('checkbox', { name: 'Task done' }));

        expect(onChange).toHaveBeenCalledWith('# Guía\n\n- [x] Probar\n');
    });
});
