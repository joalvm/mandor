import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useOpenedOnce } from '../../../src/components/tabs/useOpenedOnce.js';

describe('a section that has been open once', () => {
    it('stays opened after it closes, and never was before it opened', () => {
        const { rerender, result } = renderHook((open: boolean) => useOpenedOnce(open), {
            initialProps: false,
        });

        expect(result.current).toBe(false);

        rerender(true);
        rerender(false);

        expect(result.current).toBe(true);
    });
});
