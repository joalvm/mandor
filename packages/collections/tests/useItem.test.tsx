import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useItem } from '../src/hooks/useItem.js';
import { ItemProvider } from '../src/item-context.js';

describe('the item a part reads', () => {
    it('is the one its row or its tab gives', () => {
        const { result } = renderHook(() => useItem(), {
            wrapper: ({ children }) => (
                <ItemProvider value={{ resource: 'mandor://r', saved: 'POST' }}>
                    {children}
                </ItemProvider>
            ),
        });

        expect(result.current).toEqual({ resource: 'mandor://r', saved: 'POST' });
    });

    it('is refused outside an item', () => {
        expect(() => {
            renderHook(() => useItem());
        }).toThrow('useItem is only read inside an item');
    });
});
