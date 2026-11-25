import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useOpenKeys } from '../../src/hooks/useOpenKeys.js';

describe('which parts of a long list are open', () => {
    it('opens and closes each key on its own', () => {
        const { result } = renderHook(() => useOpenKeys());

        act(() => {
            result.current.toggle('a');
            result.current.toggle('b');
        });

        expect([...result.current.open]).toEqual(['a', 'b']);

        act(() => {
            result.current.toggle('a');
        });

        expect([...result.current.open]).toEqual(['b']);
    });
});
