import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { SidebarSectionIdContext } from '../../src/components/sidebar/sidebar-section-context.js';
import { shellStore, useUnfoldSection } from '../../src/index.js';

function inSection(id: string | null) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return <SidebarSectionIdContext value={id}>{children}</SidebarSectionIdContext>;
    };
}

function folded(): readonly string[] {
    return shellStore.getState().panels.collapsedSections;
}

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.getState().setPanels({ collapsedSections: ['docs', 'collections'] });
});

describe('opening the section an action is drawn in', () => {
    it('unfolds that section and leaves the other folded ones as they were', () => {
        const { result } = renderHook(() => useUnfoldSection(), { wrapper: inSection('docs') });

        result.current();

        expect(folded()).toEqual(['collections']);
    });

    it('does nothing outside a section', () => {
        const { result } = renderHook(() => useUnfoldSection(), { wrapper: inSection(null) });

        result.current();

        expect(folded()).toEqual(['docs', 'collections']);
    });

    it('does nothing when the section is already open', () => {
        const { result } = renderHook(() => useUnfoldSection(), { wrapper: inSection('env') });

        result.current();

        expect(folded()).toEqual(['docs', 'collections']);
    });
});
