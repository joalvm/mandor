import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { shellStore, useSplit } from '../../src/index.js';

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.setState({ activeWorkspaceId: 'api' });
});

describe('where the line of a split sits', () => {
    it('starts where the surface says, and stays where the reader leaves it', () => {
        const { result, unmount } = renderHook(() => useSplit('request', 50));

        expect(result.current[0]).toBe(50);

        act(() => {
            result.current[1](30);
        });

        expect(result.current[0]).toBe(30);

        unmount();

        expect(renderHook(() => useSplit('request', 50)).result.current[0]).toBe(30);
    });

    it('is its own for each kind of surface', () => {
        const { result } = renderHook(() => useSplit('request', 50));

        act(() => {
            result.current[1](30);
        });

        expect(renderHook(() => useSplit('graphql', 65)).result.current[0]).toBe(65);
    });

    it('is its own for each workspace', () => {
        const { result } = renderHook(() => useSplit('request', 50));

        act(() => {
            result.current[1](30);
        });
        act(() => {
            shellStore.setState({ activeWorkspaceId: 'otro' });
        });

        expect(result.current[0]).toBe(50);
    });

    it('travels in the session the window writes down', () => {
        const { result } = renderHook(() => useSplit('request', 50));

        act(() => {
            result.current[1](30);
        });

        expect(shellStore.getState().panels.splits).toEqual({ 'api/request': 30 });
    });
});
