import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useInheritedAuthLabel } from '../../../../src/renderer/features/requests/hooks/useInheritedAuthLabel.js';
import { AppProviders } from '../../support/app-providers.js';

describe('useInheritedAuthLabel', () => {
    it('names the scheme and the level that rules', () => {
        const { result } = renderHook(
            () =>
                useInheritedAuthLabel({
                    name: 'Personal',
                    place: { kind: 'workspace' },
                    scheme: 'bearer',
                }),
            { wrapper: AppProviders },
        );

        expect(result.current).toBe('Uses Bearer from Personal.');
    });

    it('says so when nobody above carries an auth', () => {
        const { result } = renderHook(() => useInheritedAuthLabel(null), {
            wrapper: AppProviders,
        });

        expect(result.current).toMatch(/the request goes out without it/u);
    });
});
