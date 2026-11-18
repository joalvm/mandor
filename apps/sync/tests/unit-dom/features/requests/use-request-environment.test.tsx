import { itemResource } from '@mandor/collections';
import { envStore } from '@mandor/env';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useRequestEnvironment } from '../../../../src/renderer/features/requests/hooks/useRequestEnvironment.js';

const RESOURCE = itemResource('Local', 'alpha', 'crear-pedido');

function environment(id: string) {
    return { id, name: id, variables: [] };
}

describe('the environment behind a request', () => {
    beforeEach(() => {
        envStore.getState().reset();
    });

    afterEach(() => {
        cleanup();
        envStore.getState().reset();
    });

    it('is the one active in the workspace the item lives in', () => {
        envStore.setState({
            activeEnvironmentIds: { alpha: 'a-env', beta: 'b-env' },
            environments: [environment('a-env'), environment('b-env')],
        });

        const { result } = renderHook(() => useRequestEnvironment(RESOURCE));

        expect(result.current?.id).toBe('a-env');
    });

    it('is nothing while the workspace has none active', () => {
        envStore.setState({ environments: [environment('a-env')] });

        const { result } = renderHook(() => useRequestEnvironment(RESOURCE));

        expect(result.current).toBeUndefined();
    });

    it('follows the workspace when the active environment changes', () => {
        envStore.setState({
            activeEnvironmentIds: { alpha: 'a-env' },
            environments: [environment('a-env'), environment('other')],
        });

        const { result } = renderHook(() => useRequestEnvironment(RESOURCE));

        act(() => {
            envStore.setState({ activeEnvironmentIds: { alpha: 'other' } });
        });

        expect(result.current?.id).toBe('other');
    });
});
