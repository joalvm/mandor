import type { Translator } from '@mandor/i18n';
import { describe, expectTypeOf, it } from 'vitest';

import type { SearchEntry, SearchField, WorkspaceEntries } from '../../src/search/search-entry.js';

describe('what the search of a workspace is made of', () => {
    it('says which field of an entry the query matched', () => {
        expectTypeOf<SearchField>().toEqualTypeOf<'content' | 'name' | 'tag' | 'trail'>();
    });

    it('describes an entry by names, never by a value or a path', () => {
        expectTypeOf<SearchEntry['source']>().toEqualTypeOf<
            'doc' | 'environment' | 'folder' | 'item' | 'variable'
        >();
        expectTypeOf<SearchEntry['name']>().toBeString();
        expectTypeOf<SearchEntry['trail']>().toBeString();
        expectTypeOf<SearchEntry['tags']>().toEqualTypeOf<readonly string[]>();
        expectTypeOf<SearchEntry>().not.toHaveProperty('value');
    });

    it('lets a feature bring its entries for the origin and workspace that are open', () => {
        expectTypeOf<WorkspaceEntries>().toEqualTypeOf<
            (origin: string, workspaceId: string, translate: Translator) => SearchEntry[]
        >();
    });
});
