import { cleanup, render, renderHook } from '@testing-library/react';
import { createRef, use } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { useSidebarSearch } from '../../../src/hooks/useSidebarSearch.js';
import {
    SidebarSearch,
    SidebarSearchField,
    SidebarSearchResults,
    useSidebarSearchField,
} from '../../../src/index.js';
import {
    SidebarSearchFieldContext,
    SidebarSearchIdContext,
} from '../../../src/search/sidebar-search-context.js';

function SearchId() {
    return <output>{use(SidebarSearchIdContext)}</output>;
}

afterEach(() => {
    cleanup();
});

describe('the searcher declared in the tree', () => {
    it('hands its minimum, its field and its results to the sidebar while it is mounted', () => {
        const declared = renderHook(() => useSidebarSearch());
        const view = render(
            <SidebarSearch minimumQuery={2} owner="collection">
                <SidebarSearchField>
                    <input aria-label="Buscar" />
                </SidebarSearchField>
                <SidebarSearchResults>
                    <p>results</p>
                </SidebarSearchResults>
            </SidebarSearch>,
        );

        expect(declared.result.current).toMatchObject({ minimumQuery: 2, owner: 'collection' });
        expect(declared.result.current?.field).toEqual(<input aria-label="Buscar" />);
        expect(declared.result.current?.results).toEqual(<p>results</p>);

        view.unmount();

        expect(declared.result.current).toBeUndefined();
    });

    it('gives its parts the id of the searcher', () => {
        const view = render(
            <SidebarSearch minimumQuery={2} owner="collection">
                <SearchId />
            </SidebarSearch>,
        );

        expect(view.container).toHaveTextContent('sidebar-search');
    });

    it('refuses a part written outside the searcher', () => {
        expect(() => {
            renderHook(() => SidebarSearchResults({ children: null }));
        }).toThrow('Sidebar search results are declared inside a SidebarSearch.');
    });
});

describe('the box the field stands in', () => {
    it('is the one the sidebar hands down to the field it draws', () => {
        const box = createRef<HTMLSpanElement>();
        const { result } = renderHook(() => useSidebarSearchField(), {
            wrapper: ({ children }) => (
                <SidebarSearchFieldContext value={box}>{children}</SidebarSearchFieldContext>
            ),
        });

        expect(result.current).toBe(box);
    });

    it('is not read outside the header of the sidebar', () => {
        expect(() => {
            renderHook(() => useSidebarSearchField());
        }).toThrow('useSidebarSearchField is only read inside the header of the sidebar.');
    });
});
