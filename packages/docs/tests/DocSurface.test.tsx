import { editorAt } from '@mandor/ui/testing/editors-in';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DocSurface } from '../src/components/surface/DocSurface.js';
import type { DocMode } from '../src/doc-view-state.js';

import { AppProviders } from './support/app-providers.js';

const KEY = 'mandor://local-apis/events/doc/guia.md';

function surface(mode: DocMode): void {
    render(
        <DocSurface
            doc={{
                label: 'Doc editor',
                modelKey: KEY,
                onChange: vi.fn(),
                place: KEY,
                value: '# Guía\n',
            }}
            onView={vi.fn()}
            view={{ mode, preview: false }}
        />,
        { wrapper: AppProviders },
    );
}

describe('the two sides of a doc', () => {
    it('shows the page on the side of reading', () => {
        surface('read');

        expect(screen.getByRole('heading', { level: 1, name: 'Guía' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Edit' })).toBeVisible();
        expect(screen.queryByRole('group', { name: 'Doc editor' })).toBeNull();
    });

    it('shows the markdown on the side of writing', async () => {
        surface('write');

        expect((await editorAt(0)).text()).toBe('# Guía\n');
        expect(screen.getByRole('button', { name: 'View' })).toBeVisible();
        expect(screen.queryByRole('heading', { name: 'Guía' })).toBeNull();
    });
});
